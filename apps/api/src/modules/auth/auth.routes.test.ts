import express from "express";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../domain/current-user.js";
import { errorHandler } from "../../middlewares/error-handler.js";
import { notFoundHandler } from "../../middlewares/not-found.js";

const mocks = vi.hoisted(() => ({
  queryMock: vi.fn(),
  currentUser: {
    authUserId: "client-1",
    email: "client@example.com",
    fullName: "Client One",
    role: "client",
    isActive: true
  } as CurrentUser | undefined,
  authClaims: {
    sub: "client-1",
    email: "client@example.com"
  } as { sub?: string; email?: string } | undefined
}));

vi.mock("../../middlewares/auth.js", () => ({
  requireAuth: (request: Request, _response: Response, next: NextFunction) => {
    request.currentUser = mocks.currentUser;
    request.authClaims = mocks.authClaims as any;
    next();
  }
}));

vi.mock("../../lib/db.js", () => ({
  query: mocks.queryMock
}));

import { authRouter } from "./auth.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      authUserId: "client-1",
      email: "client@example.com",
      fullName: "Client One",
      role: "client",
      isActive: true
    };
    mocks.authClaims = {
      sub: "client-1",
      email: "client@example.com"
    };
  });

  it("returns the current API profile", async () => {
    const response = await request(createApp()).get("/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("client@example.com");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it("rejects invalid profile payloads", async () => {
    const response = await request(createApp()).post("/auth/profile").send({
      fullName: "Lu",
      role: "client"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid profile payload.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it("creates or updates a self-service profile", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        auth_user_id: "client-1",
        email: "client@example.com",
        full_name: "Client One",
        role: "client",
        phone: "3333333333",
        address: "Aldama 1473",
        is_active: true,
        created_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).post("/auth/profile").send({
      fullName: "Client One",
      role: "client",
      phone: "3333333333",
      address: "Aldama 1473"
    });

    expect(response.status).toBe(201);
    expect(response.body.profile.auth_user_id).toBe("client-1");
    expect(mocks.queryMock).toHaveBeenCalledWith(expect.any(String), [
      "client-1",
      "client@example.com",
      "Client One",
      "client",
      "3333333333",
      "Aldama 1473"
    ]);
  });

  it("requires sub and email claims before creating the profile", async () => {
    mocks.authClaims = { sub: "client-1" };

    const response = await request(createApp()).post("/auth/profile").send({
      fullName: "Client One",
      role: "client"
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token payload is missing sub/email claims.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });
});
