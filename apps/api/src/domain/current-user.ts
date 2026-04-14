import type { JWTPayload } from "jose";
import type { UserRole } from "./roles.js";

export interface CurrentUser {
  authUserId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export type AuthClaims = JWTPayload & {
  email?: string;
  role?: string;
};
