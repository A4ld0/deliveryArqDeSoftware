import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/require-role.js";

const CreateIncidentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  title: z.string().min(5).max(120),
  description: z.string().min(10).max(500)
});

const UpdateIncidentSchema = z.object({
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"])
});

export const incidentsRouter = Router();

interface IncidentOrderAudienceRow {
  [key: string]: unknown;
  id: number;
  customer_id: string;
  owner_user_id: string;
  driver_id: string | null;
}

incidentsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const parsed = CreateIncidentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid incident payload.", parsed.error.flatten());
    }

    const user = request.currentUser!;
    const orderAudienceRows = await query<IncidentOrderAudienceRow>(
      `
      SELECT
        o.id,
        o.customer_id,
        r.owner_user_id,
        d.driver_id
      FROM orders o
      JOIN restaurants r ON r.id = o.restaurant_id
      LEFT JOIN deliveries d ON d.order_id = o.id
      WHERE o.id = $1
      `,
      [parsed.data.orderId]
    );

    const orderAudience = orderAudienceRows[0];
    if (!orderAudience) {
      throw new HttpError(404, "Order not found.");
    }

    if (user.role !== "admin") {
      const canReport =
        user.authUserId === orderAudience.customer_id ||
        user.authUserId === orderAudience.owner_user_id ||
        user.authUserId === orderAudience.driver_id;

      if (!canReport) {
        throw new HttpError(
          403,
          "You can only report incidents for orders linked to your account."
        );
      }
    }

    const rows = await query(
      `
      INSERT INTO incidents (order_id, reported_by, title, description, status)
      VALUES ($1, $2, $3, $4, 'OPEN')
      RETURNING id, order_id, reported_by, title, description, status, created_at, updated_at
      `,
      [parsed.data.orderId, user.authUserId, parsed.data.title, parsed.data.description]
    );

    response.status(201).json({ incident: rows[0] });
  })
);

incidentsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = request.currentUser!;

    if (user.role === "admin") {
      const incidents = await query(
        `
        SELECT id, order_id, reported_by, title, description, status, created_at, updated_at
        FROM incidents
        ORDER BY created_at DESC
        LIMIT 200
        `
      );
      response.json({ incidents });
      return;
    }

    const incidents = await query(
      `
      SELECT id, order_id, reported_by, title, description, status, created_at, updated_at
      FROM incidents
      WHERE reported_by = $1
      ORDER BY created_at DESC
      `,
      [user.authUserId]
    );

    response.json({ incidents });
  })
);

incidentsRouter.patch(
  "/:incidentId/status",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (request, response) => {
    const incidentId = Number.parseInt(request.params.incidentId, 10);
    if (Number.isNaN(incidentId)) {
      throw new HttpError(400, "incidentId must be numeric.");
    }

    const parsed = UpdateIncidentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid incident status payload.");
    }

    const rows = await query(
      `
      UPDATE incidents
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, order_id, reported_by, title, description, status, created_at, updated_at
      `,
      [parsed.data.status, incidentId]
    );

    if (!rows[0]) throw new HttpError(404, "Incident not found.");
    response.json({ incident: rows[0] });
  })
);
