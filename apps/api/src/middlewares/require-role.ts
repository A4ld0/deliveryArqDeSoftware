import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../domain/roles.js";
import { HttpError } from "../lib/http-error.js";

export function requireRole(allowed: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const user = request.currentUser;
    if (!user) {
      next(new HttpError(401, "Authentication required."));
      return;
    }

    if (!allowed.includes(user.role)) {
      next(new HttpError(403, "Insufficient permissions."));
      return;
    }

    next();
  };
}

