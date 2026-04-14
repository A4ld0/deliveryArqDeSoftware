import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../domain/current-user.js";
import { errorHandler } from "../../middlewares/error-handler.js";
import { notFoundHandler } from "../../middlewares/not-found.js";
import type { NextFunction, Request, Response } from "express";

const mocks = vi.hoisted(() => {
  return {
    queryMock: vi.fn(),
    currentUser: {
      authUserId: "client-1",
      email: "client@example.com",
      fullName: "Client One",
      role: "client",
      isActive: true
    } as CurrentUser | undefined
  };
});

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

import { incidentsRouter } from "./incidents.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/incidents", incidentsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("incidents routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      authUserId: "client-1",
      email: "client@example.com",
      fullName: "Client One",
      role: "client",
      isActive: true
    };
  });

  it("rejects invalid payloads", async () => {
    const response = await request(createApp()).post("/incidents").send({
      orderId: 1,
      title: "No",
      description: "Short"
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid incident payload.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it("rejects users not linked to the order", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 1,
        customer_id: "other-client",
        owner_user_id: "restaurant-9",
        driver_id: "driver-9"
      }
    ]);

    const response = await request(createApp()).post("/incidents").send({
      orderId: 1,
      title: "Pedido incompleto",
      description: "Faltaron productos en la entrega final."
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("linked to your account");
    expect(mocks.queryMock).toHaveBeenCalledTimes(1);
  });

  it("allows linked clients to create incidents", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 1,
        customer_id: "client-1",
        owner_user_id: "restaurant-9",
        driver_id: "driver-9"
      }
    ]);
    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 51,
        order_id: 1,
        reported_by: "client-1",
        title: "Pedido incompleto",
        description: "Faltaron productos en la entrega final.",
        status: "OPEN",
        created_at: "2026-04-04T00:00:00.000Z",
        updated_at: "2026-04-04T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).post("/incidents").send({
      orderId: 1,
      title: "Pedido incompleto",
      description: "Faltaron productos en la entrega final."
    });

    expect(response.status).toBe(201);
    expect(response.body.incident.id).toBe(51);
    expect(response.body.incident.status).toBe("OPEN");
    expect(mocks.queryMock).toHaveBeenCalledTimes(2);
  });

  it("allows admin users to report incidents for any order", async () => {
    mocks.currentUser = {
      authUserId: "admin-1",
      email: "admin@example.com",
      fullName: "Admin One",
      role: "admin",
      isActive: true
    };

    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 1,
        customer_id: "client-2",
        owner_user_id: "restaurant-2",
        driver_id: "driver-2"
      }
    ]);
    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 77,
        order_id: 1,
        reported_by: "admin-1",
        title: "Revision administrativa",
        description: "Se detecto inconsistencia de estado en el pedido.",
        status: "OPEN",
        created_at: "2026-04-04T00:00:00.000Z",
        updated_at: "2026-04-04T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).post("/incidents").send({
      orderId: 1,
      title: "Revision administrativa",
      description: "Se detecto inconsistencia de estado en el pedido."
    });

    expect(response.status).toBe(201);
    expect(response.body.incident.reported_by).toBe("admin-1");
  });
});
