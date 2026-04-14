import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { query } from "../../lib/db.js";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.js";

const SELF_SERVICE_ROLES = ["client", "restaurant", "driver"] as const;

const ProfileSchema = z.object({
  fullName: z.string().min(3).max(120),
  role: z.enum(SELF_SERVICE_ROLES),
  phone: z.string().max(30).optional(),
  address: z.string().max(250).optional()
});

export const authRouter = Router();

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    if (!request.currentUser) {
      throw new HttpError(404, "User profile not found in API.");
    }

    response.json({
      user: request.currentUser
    });
  })
);

authRouter.post(
  "/profile",
  requireAuth,
  asyncHandler(async (request, response) => {
    const parsed = ProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid profile payload.", parsed.error.flatten());
    }

    const authUserId = request.authClaims?.sub;
    const email = request.authClaims?.email;
    if (!authUserId || !email) {
      throw new HttpError(401, "Token payload is missing sub/email claims.");
    }

    const rows = await query<{
      auth_user_id: string;
      email: string;
      full_name: string;
      role: string;
      phone: string | null;
      address: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `
      INSERT INTO users (auth_user_id, email, full_name, role, phone, address, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (auth_user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = now()
      RETURNING auth_user_id, email, full_name, role, phone, address, is_active, created_at, updated_at
      `,
      [
        authUserId,
        email,
        parsed.data.fullName,
        parsed.data.role,
        parsed.data.phone ?? null,
        parsed.data.address ?? null
      ]
    );

    const profile = rows[0];
    if (!profile) {
      throw new HttpError(500, "Could not create user profile.");
    }

    response.status(201).json({ profile });
  })
);
