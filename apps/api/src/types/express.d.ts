import type { AuthClaims, CurrentUser } from "../domain/current-user.js";

declare global {
  namespace Express {
    interface Request {
      authClaims?: AuthClaims;
      currentUser?: CurrentUser;
    }
  }
}

export {};

