import type { Request, Response } from "express";

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({
    error: "Resource not found."
  });
}

