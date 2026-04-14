import { Router } from "express";
import { z } from "zod";
import { USER_ROLES } from "../../domain/roles.js";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/require-role.js";

const UpdateUserSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => value.role !== undefined || value.isActive !== undefined, {
    message: "Provide at least one field to update."
  });

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["admin"]));

adminRouter.get(
  "/metrics",
  asyncHandler(async (_request, response) => {
    const [ordersByStatus, incidentsByStatus, usersByRole] = await Promise.all([
      query<{ status: string; count: string }>(
        `
        SELECT status::text AS status, COUNT(*)::text AS count
        FROM orders
        GROUP BY status
        ORDER BY status
        `
      ),
      query<{ status: string; count: string }>(
        `
        SELECT status::text AS status, COUNT(*)::text AS count
        FROM incidents
        GROUP BY status
        ORDER BY status
        `
      ),
      query<{ role: string; count: string }>(
        `
        SELECT role::text AS role, COUNT(*)::text AS count
        FROM users
        GROUP BY role
        ORDER BY role
        `
      )
    ]);

    response.json({
      metrics: {
        ordersByStatus,
        incidentsByStatus,
        usersByRole
      }
    });
  })
);

adminRouter.get(
  "/users",
  asyncHandler(async (_request, response) => {
    const users = await query(
      `
      SELECT auth_user_id, email, full_name, role, phone, address, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 200
      `
    );
    response.json({ users });
  })
);

adminRouter.patch(
  "/users/:authUserId",
  asyncHandler(async (request, response) => {
    const parsed = UpdateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid user update payload.", parsed.error.flatten());
    }

    const rows = await query(
      `
      UPDATE users
      SET
        role = COALESCE($1, role),
        is_active = COALESCE($2, is_active),
        updated_at = now()
      WHERE auth_user_id = $3
      RETURNING auth_user_id, email, full_name, role, phone, address, is_active, created_at, updated_at
      `,
      [
        parsed.data.role ?? null,
        parsed.data.isActive ?? null,
        request.params.authUserId
      ]
    );

    if (!rows[0]) throw new HttpError(404, "User not found.");
    response.json({ user: rows[0] });
  })
);
