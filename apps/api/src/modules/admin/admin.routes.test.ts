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
    authUserId: "admin-1",
    email: "admin@example.com",
    fullName: "Admin One",
    role: "admin",
    isActive: true
  } as CurrentUser | undefined
}));

vi.mock("../../middlewares/auth.js", () => ({
  requireAuth: (request: Request, _response: Response, next: NextFunction) => {
    request.currentUser = mocks.currentUser;
    next();
  }
}));

vi.mock("../../middlewares/require-role.js", () => ({
  requireRole: () => (_request: Request, _response: Response, next: NextFunction) => {
    next();
  }
}));

vi.mock("../../lib/db.js", () => ({
  query: mocks.queryMock
}));

import { adminRouter } from "./admin.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/admin", adminRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns dashboard metrics grouped by status and role", async () => {
    mocks.queryMock.mockResolvedValueOnce([{ status: "PENDING", count: "2" }]);
    mocks.queryMock.mockResolvedValueOnce([{ status: "OPEN", count: "1" }]);
    mocks.queryMock.mockResolvedValueOnce([{ role: "client", count: "5" }]);

    const response = await request(createApp()).get("/admin/metrics");

    expect(response.status).toBe(200);
    expect(response.body.metrics.ordersByStatus).toEqual([
      { status: "PENDING", count: "2" }
    ]);
    expect(response.body.metrics.incidentsByStatus).toEqual([
      { status: "OPEN", count: "1" }
    ]);
    expect(response.body.metrics.usersByRole).toEqual([
      { role: "client", count: "5" }
    ]);
  });

  it("lists users for administration", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        auth_user_id: "client-1",
        email: "client@example.com",
        full_name: "Client One",
        role: "client",
        phone: null,
        address: null,
        is_active: true,
        created_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).get("/admin/users");

    expect(response.status).toBe(200);
    expect(response.body.users[0].auth_user_id).toBe("client-1");
  });

  it("updates a user role and active flag", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        auth_user_id: "client-1",
        email: "client@example.com",
        full_name: "Client One",
        role: "driver",
        phone: null,
        address: null,
        is_active: false,
        created_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).patch("/admin/users/client-1").send({
      role: "driver",
      isActive: false
    });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("driver");
    expect(response.body.user.is_active).toBe(false);
    expect(mocks.queryMock).toHaveBeenCalledWith(expect.any(String), [
      "driver",
      false,
      "client-1"
    ]);
  });

  it("rejects empty admin user updates", async () => {
    const response = await request(createApp()).patch("/admin/users/client-1").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid user update payload.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user does not exist", async () => {
    mocks.queryMock.mockResolvedValueOnce([]);

    const response = await request(createApp()).patch("/admin/users/missing").send({
      isActive: false
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User not found.");
  });
});
