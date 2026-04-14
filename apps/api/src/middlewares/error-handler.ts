import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message,
      details: error.details ?? null
    });
    return;
  }

  response.status(500).json({
    error: "Internal server error.",
    details:
      env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : null
  });
}
