import { Router } from "express";
import { z } from "zod";
import type { PoolClient } from "pg";
import type { CurrentUser } from "../../domain/current-user.js";
import {
  canTransition,
  isOrderStatus,
  type OrderStatus
} from "../../domain/order-status.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { withTransaction } from "../../lib/transaction.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/require-role.js";
import { publishOrderStatusChanged } from "../../realtime/order-events.js";

const CreateOrderSchema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  deliveryAddress: z.string().min(6).max(250),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive().max(20)
      })
    )
    .min(1),
  paymentMethod: z.string().min(3).max(40).default("SIMULATED_CARD")
});

const UpdateStatusSchema = z.object({
  status: z.string(),
  reason: z.string().max(255).optional()
});

interface OrderContext {
  [key: string]: unknown;
  id: number;
  status: OrderStatus;
  customer_id: string;
  restaurant_id: number;
  restaurant_owner_user_id: string;
  driver_id: string | null;
}

interface ProductPriceRow {
  id: number | string;
  price: string;
  available: boolean;
}

async function loadOrderContext(orderId: number): Promise<OrderContext> {
  const rows = await query<OrderContext>(
    `
    SELECT
      o.id,
      o.status,
      o.customer_id,
      o.restaurant_id,
      r.owner_user_id AS restaurant_owner_user_id,
      d.driver_id
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    LEFT JOIN deliveries d ON d.order_id = o.id
    WHERE o.id = $1
    `,
    [orderId]
  );

  const order = rows[0];
  if (!order) throw new HttpError(404, "Order not found.");
  return order;
}

function assertStatusChangeAllowed(
  currentUser: CurrentUser,
  order: OrderContext,
  nextStatus: OrderStatus
) {
  if (!canTransition(order.status, nextStatus)) {
    throw new HttpError(
      409,
      `Invalid transition from ${order.status} to ${nextStatus}.`
    );
  }

  if (currentUser.role === "admin") return;

  if (currentUser.role === "client") {
    if (order.customer_id !== currentUser.authUserId) {
      throw new HttpError(403, "You can only modify your own orders.");
    }
    if (nextStatus !== "CANCELLED") {
      throw new HttpError(403, "Client can only request order cancellation.");
    }
    if (!["PENDING", "ACCEPTED"].includes(order.status)) {
      throw new HttpError(
        409,
        "Client can cancel only when status is PENDING or ACCEPTED."
      );
    }
    return;
  }

  if (currentUser.role === "restaurant") {
    if (order.restaurant_owner_user_id !== currentUser.authUserId) {
      throw new HttpError(403, "You can only modify your restaurant orders.");
    }
    if (!["ACCEPTED", "REJECTED", "READY_FOR_PICKUP"].includes(nextStatus)) {
      throw new HttpError(
        403,
        "Restaurant can set ACCEPTED, REJECTED or READY_FOR_PICKUP."
      );
    }
    return;
  }

  if (currentUser.role === "driver") {
    if (order.driver_id !== currentUser.authUserId) {
      throw new HttpError(403, "Order is not assigned to current driver.");
    }
    if (!["IN_TRANSIT", "DELIVERED"].includes(nextStatus)) {
      throw new HttpError(403, "Driver can set IN_TRANSIT or DELIVERED.");
    }
  }
}

async function createOrderInTransaction(
  client: PoolClient,
  payload: z.infer<typeof CreateOrderSchema>,
  authUserId: string
) {
  const productIds = payload.items.map((item) => item.productId);

  const productRows = await client.query<ProductPriceRow>(
    `
    SELECT id, price::text, available
    FROM products
    WHERE restaurant_id = $1
      AND id = ANY($2::bigint[])
    `,
    [payload.restaurantId, productIds]
  );

  if (productRows.rows.length !== productIds.length) {
    throw new HttpError(400, "One or more products do not belong to restaurant.");
  }

  const unavailable = productRows.rows.filter((row) => !row.available);
  if (unavailable.length > 0) {
    throw new HttpError(409, "One or more products are unavailable.");
  }

  const priceByProduct = new Map<number, number>();
  for (const row of productRows.rows) {
    const productId = Number(row.id);
    priceByProduct.set(productId, Number(row.price));
  }

  let subtotal = 0;
  for (const item of payload.items) {
    const unitPrice = priceByProduct.get(item.productId);
    if (unitPrice === undefined) {
      throw new HttpError(400, `Product ${item.productId} not found.`);
    }
    subtotal += unitPrice * item.quantity;
  }

  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const orderResult = await client.query<{
    id: number;
    status: OrderStatus;
    subtotal: string;
    delivery_fee: string;
    total: string;
    created_at: string;
    updated_at: string;
  }>(
    `
    INSERT INTO orders (
      customer_id,
      restaurant_id,
      status,
      subtotal,
      delivery_fee,
      total,
      delivery_address
    )
    VALUES ($1, $2, 'PENDING', $3, $4, $5, $6)
    RETURNING id, status, subtotal::text, delivery_fee::text, total::text, created_at, updated_at
    `,
    [
      authUserId,
      payload.restaurantId,
      subtotal.toFixed(2),
      deliveryFee.toFixed(2),
      total.toFixed(2),
      payload.deliveryAddress
    ]
  );

  const order = orderResult.rows[0];

  for (const item of payload.items) {
    const unitPrice = priceByProduct.get(item.productId)!;
    const lineTotal = unitPrice * item.quantity;

    await client.query(
      `
      INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        order.id,
        item.productId,
        item.quantity,
        unitPrice.toFixed(2),
        lineTotal.toFixed(2)
      ]
    );
  }

  await client.query(
    `
    INSERT INTO payments (order_id, payment_method, payment_status, amount, paid_at)
    VALUES ($1, $2, 'SIMULATED_APPROVED', $3, now())
    `,
    [order.id, payload.paymentMethod, total.toFixed(2)]
  );

  await client.query(
    `
    INSERT INTO order_status_history (order_id, status, changed_by, notes)
    VALUES ($1, 'PENDING', $2, 'Order created by client.')
    `,
    [order.id, authUserId]
  );

  return order;
}

async function safePublishOrderStatusChanged(
  orderId: number,
  status: OrderStatus
): Promise<void> {
  try {
    await publishOrderStatusChanged(orderId, status);
  } catch (error) {
    console.error("Failed to publish order status change.", {
      orderId,
      status,
      error
    });
  }
}

export const ordersRouter = Router();

ordersRouter.post(
  "/",
  requireAuth,
  requireRole(["client"]),
  asyncHandler(async (request, response) => {
    const parsed = CreateOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid order payload.", parsed.error.flatten());
    }

    const currentUser = request.currentUser!;
    const order = await withTransaction((client) =>
      createOrderInTransaction(client, parsed.data, currentUser.authUserId)
    );

    await safePublishOrderStatusChanged(order.id, order.status);
    response.status(201).json({ order });
  })
);

ordersRouter.get(
  "/my",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = request.currentUser;
    if (!user) throw new HttpError(401, "Authentication required.");

    let sql = `
      SELECT o.id, o.status, o.restaurant_id, o.customer_id, o.total::text AS total, o.created_at, o.updated_at
      FROM orders o
    `;
    const params: unknown[] = [];

    if (user.role === "client") {
      sql += " WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 100";
      params.push(user.authUserId);
    } else if (user.role === "restaurant") {
      sql += `
        JOIN restaurants r ON r.id = o.restaurant_id
        WHERE r.owner_user_id = $1
        ORDER BY o.created_at DESC LIMIT 100
      `;
      params.push(user.authUserId);
    } else if (user.role === "driver") {
      sql += `
        JOIN deliveries d ON d.order_id = o.id
        WHERE d.driver_id = $1
        ORDER BY o.created_at DESC LIMIT 100
      `;
      params.push(user.authUserId);
    } else {
      sql += " ORDER BY o.created_at DESC LIMIT 100";
    }

    const orders = await query(sql, params);
    response.json({ orders });
  })
);

ordersRouter.patch(
  "/:orderId/status",
  requireAuth,
  asyncHandler(async (request, response) => {
    const orderId = Number.parseInt(request.params.orderId, 10);
    if (Number.isNaN(orderId)) throw new HttpError(400, "orderId must be numeric.");

    const parsed = UpdateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid status payload.", parsed.error.flatten());
    }

    if (!isOrderStatus(parsed.data.status)) {
      throw new HttpError(400, "Unknown order status.");
    }

    const user = request.currentUser;
    if (!user) throw new HttpError(401, "Authentication required.");

    const orderContext = await loadOrderContext(orderId);
    assertStatusChangeAllowed(user, orderContext, parsed.data.status);

    const updatedRows = await withTransaction(async (client) => {
      const updated = await client.query<{
        id: number;
        status: OrderStatus;
        updated_at: string;
      }>(
        `
        UPDATE orders
        SET
          status = $1::order_status,
          updated_at = now(),
          cancellation_reason = CASE
            WHEN $1::order_status = 'CANCELLED'::order_status THEN COALESCE($2, cancellation_reason)
            ELSE cancellation_reason
          END
        WHERE id = $3
        RETURNING id, status, updated_at
        `,
        [parsed.data.status, parsed.data.reason ?? null, orderId]
      );

      if (!updated.rows[0]) {
        throw new HttpError(404, "Order not found.");
      }

      if (parsed.data.status === "CANCELLED") {
        await client.query(
          `
          UPDATE payments
          SET payment_status = 'SIMULATED_REFUNDED'
          WHERE order_id = $1
          `,
          [orderId]
        );
      }

      await client.query(
        `
        INSERT INTO order_status_history (order_id, status, changed_by, notes)
        VALUES ($1, $2, $3, $4)
        `,
        [
          orderId,
          parsed.data.status,
          user.authUserId,
          parsed.data.reason ?? null
        ]
      );

      return updated.rows[0];
    });

    await safePublishOrderStatusChanged(updatedRows.id, updatedRows.status);
    response.json({ order: updatedRows });
  })
);
