import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { isUserRole } from "../domain/roles.js";
import { query } from "../lib/db.js";
import { HttpError } from "../lib/http-error.js";

const jwks = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

function getBearerToken(request: Request): string | null {
  const value = request.header("authorization");
  if (value) {
    const [scheme, token] = value.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) return token;
  }

  // SSE clients (EventSource) cannot send custom headers, so we allow query token.
  const queryToken = request.query.access_token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }

  return null;
}

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  const token = getBearerToken(request);
  if (!token) {
    next(new HttpError(401, "Authorization token is required."));
    return;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.SUPABASE_JWT_ISSUER,
      audience: env.SUPABASE_JWT_AUDIENCE
    });
    request.authClaims = payload;

    const authUserId = payload.sub;
    if (!authUserId) {
      throw new HttpError(401, "Invalid token: missing subject.");
    }

    const rows = await query<{
      auth_user_id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
    }>(
      `
      SELECT auth_user_id, email, full_name, role, is_active
      FROM users
      WHERE auth_user_id = $1
      `,
      [authUserId]
    );

    const user = rows[0];
    if (user && isUserRole(user.role)) {
      if (!user.is_active) {
        throw new HttpError(403, "User account is inactive.");
      }

      request.currentUser = {
        authUserId: user.auth_user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active
      };
    } else {
      // First-time users can continue without local profile and create it in /auth/profile.
      request.currentUser = undefined;
    }

    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid token."));
  }
}
