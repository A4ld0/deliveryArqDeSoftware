import { Router } from "express";
import { z } from "zod";
import { isOrderStatus } from "../../domain/order-status.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { withTransaction } from "../../lib/transaction.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/require-role.js";
import {
  publishDeliveryLocationChanged,
  publishOrderStatusChanged
} from "../../realtime/order-events.js";

const UpdateDeliveryStatusSchema = z.object({
  status: z.enum(["IN_TRANSIT", "DELIVERED"])
});

const UpdateDeliveryLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0).max(100000).nullable().optional()
});

export const deliveriesRouter = Router();

async function safePublishOrderStatusChanged(
  orderId: number,
  status: "ASSIGNED" | "IN_TRANSIT" | "DELIVERED"
): Promise<void> {
  try {
    await publishOrderStatusChanged(orderId, status);
  } catch (error) {
    console.error("Failed to publish delivery status change.", {
      orderId,
      status,
      error
    });
  }
}

async function safePublishDeliveryLocationChanged(
  orderId: number,
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  }
): Promise<void> {
  try {
    await publishDeliveryLocationChanged(orderId, location);
  } catch (error) {
    console.error("Failed to publish delivery location change.", {
      orderId,
      error
    });
  }
}

deliveriesRouter.get(
  "/available",
  requireAuth,
  requireRole(["driver"]),
  asyncHandler(async (_request, response) => {
    const orders = await query(
      `
      SELECT
        o.id,
        o.status,
        o.restaurant_id,
        o.total::text AS total,
        o.delivery_address,
        o.created_at
      FROM orders o
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE o.status = 'READY_FOR_PICKUP'
        AND d.order_id IS NULL
      ORDER BY o.created_at ASC
      LIMIT 100
      `
    );

    response.json({ orders });
  })
);

deliveriesRouter.post(
  "/:orderId/accept",
  requireAuth,
  requireRole(["driver"]),
  asyncHandler(async (request, response) => {
    const orderId = Number.parseInt(request.params.orderId, 10);
    if (Number.isNaN(orderId)) throw new HttpError(400, "orderId must be numeric.");

    const driverId = request.currentUser!.authUserId;

    const result = await withTransaction(async (client) => {
      const orderRows = await client.query<{ status: string }>(
        `
        SELECT status
        FROM orders
        WHERE id = $1
        FOR UPDATE
        `,
        [orderId]
      );

      const order = orderRows.rows[0];
      if (!order) throw new HttpError(404, "Order not found.");
      if (order.status !== "READY_FOR_PICKUP") {
        throw new HttpError(
          409,
          "Order can only be accepted when status is READY_FOR_PICKUP."
        );
      }

      const deliveryRows = await client.query<{ order_id: number }>(
        `
        SELECT order_id
        FROM deliveries
        WHERE order_id = $1
        `,
        [orderId]
      );

      if (deliveryRows.rows[0]) {
        throw new HttpError(409, "Order is already assigned.");
      }

      const delivery = await client.query(
        `
        INSERT INTO deliveries (order_id, driver_id, status, assigned_at)
        VALUES ($1, $2, 'ASSIGNED', now())
        RETURNING order_id, driver_id, status, assigned_at
        `,
        [orderId, driverId]
      );

      await client.query(
        `
        UPDATE orders
        SET status = 'ASSIGNED', updated_at = now()
        WHERE id = $1
        `,
        [orderId]
      );

      await client.query(
        `
        INSERT INTO order_status_history (order_id, status, changed_by, notes)
        VALUES ($1, 'ASSIGNED', $2, 'Driver accepted delivery.')
        `,
        [orderId, driverId]
      );

      return delivery.rows[0];
    });

    await safePublishOrderStatusChanged(orderId, "ASSIGNED");
    response.status(201).json({ delivery: result });
  })
);

deliveriesRouter.post(
  "/:orderId/location",
  requireAuth,
  requireRole(["driver"]),
  asyncHandler(async (request, response) => {
    const orderId = Number.parseInt(request.params.orderId, 10);
    if (Number.isNaN(orderId)) throw new HttpError(400, "orderId must be numeric.");

    const parsed = UpdateDeliveryLocationSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "Invalid delivery location payload.",
        parsed.error.flatten()
      );
    }

    const driverId = request.currentUser!.authUserId;
    const location = {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracy: parsed.data.accuracy ?? null
    };

    const rows = await query<{
      order_id: number;
      driver_id: string;
      status: string;
      driver_latitude: number;
      driver_longitude: number;
      driver_accuracy: number | null;
      location_updated_at: string;
    }>(
      `
      UPDATE deliveries
      SET
        driver_latitude = $1,
        driver_longitude = $2,
        driver_accuracy = $3,
        location_updated_at = now()
      WHERE order_id = $4
        AND driver_id = $5
        AND status IN ('ASSIGNED', 'IN_TRANSIT')
      RETURNING
        order_id,
        driver_id,
        status,
        driver_latitude::float8 AS driver_latitude,
        driver_longitude::float8 AS driver_longitude,
        driver_accuracy::float8 AS driver_accuracy,
        location_updated_at
      `,
      [
        location.latitude,
        location.longitude,
        location.accuracy,
        orderId,
        driverId
      ]
    );

    const delivery = rows[0];
    if (!delivery) {
      throw new HttpError(404, "Active delivery assignment not found.");
    }

    await safePublishDeliveryLocationChanged(orderId, location);
    response.json({ delivery });
  })
);

deliveriesRouter.patch(
  "/:orderId/status",
  requireAuth,
  requireRole(["driver"]),
  asyncHandler(async (request, response) => {
    const orderId = Number.parseInt(request.params.orderId, 10);
    if (Number.isNaN(orderId)) throw new HttpError(400, "orderId must be numeric.");

    const parsed = UpdateDeliveryStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        "Invalid delivery status payload.",
        parsed.error.flatten()
      );
    }

    const driverId = request.currentUser!.authUserId;
    const nextStatus = parsed.data.status;

    const updated = await withTransaction(async (client) => {
      const rows = await client.query<{
        order_status: string;
        delivery_status: string;
      }>(
        `
        SELECT o.status AS order_status, d.status AS delivery_status
        FROM deliveries d
        JOIN orders o ON o.id = d.order_id
        WHERE d.order_id = $1 AND d.driver_id = $2
        FOR UPDATE
        `,
        [orderId, driverId]
      );

      const current = rows.rows[0];
      if (!current) throw new HttpError(404, "Delivery assignment not found.");

      if (!isOrderStatus(current.order_status)) {
        throw new HttpError(500, "Order has invalid status in database.");
      }

      if (
        (current.order_status === "ASSIGNED" && nextStatus !== "IN_TRANSIT") ||
        (current.order_status === "IN_TRANSIT" && nextStatus !== "DELIVERED")
      ) {
        throw new HttpError(
          409,
          `Invalid driver transition from ${current.order_status} to ${nextStatus}.`
        );
      }

      const delivery = await client.query(
        `
        UPDATE deliveries
        SET
          status = $1::order_status,
          picked_up_at = CASE WHEN $1::order_status = 'IN_TRANSIT'::order_status THEN now() ELSE picked_up_at END,
          delivered_at = CASE WHEN $1::order_status = 'DELIVERED'::order_status THEN now() ELSE delivered_at END
        WHERE order_id = $2 AND driver_id = $3
        RETURNING order_id, driver_id, status, assigned_at, picked_up_at, delivered_at
        `,
        [nextStatus, orderId, driverId]
      );

      await client.query(
        `
        UPDATE orders
        SET status = $1::order_status, updated_at = now()
        WHERE id = $2
        `,
        [nextStatus, orderId]
      );

      await client.query(
        `
        INSERT INTO order_status_history (order_id, status, changed_by, notes)
        VALUES ($1, $2, $3, $4)
        `,
        [
          orderId,
          nextStatus,
          driverId,
          nextStatus === "DELIVERED"
            ? "Driver marked order as delivered."
            : "Driver started transit."
        ]
      );

      return delivery.rows[0];
    });

    await safePublishOrderStatusChanged(orderId, nextStatus);
    response.json({ delivery: updated });
  })
);
