import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../domain/current-user.js";
import type { OrderStatus } from "../../domain/order-status.js";
import { errorHandler } from "../../middlewares/error-handler.js";
import { notFoundHandler } from "../../middlewares/not-found.js";
import type { NextFunction, Request, Response } from "express";

const mocks = vi.hoisted(() => {
  return {
    queryMock: vi.fn(),
    withTransactionMock: vi.fn(),
    publishOrderStatusChangedMock: vi.fn(),
    currentUser: {
      authUserId: "restaurant-owner-1",
      email: "restaurant@example.com",
      fullName: "Restaurant Owner",
      role: "restaurant",
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

vi.mock("../../lib/transaction.js", () => ({
  withTransaction: mocks.withTransactionMock
}));

vi.mock("../../realtime/order-events.js", () => ({
  publishOrderStatusChanged: mocks.publishOrderStatusChangedMock
}));

import { ordersRouter } from "./orders.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/orders", ordersRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function mockOrderContext(currentStatus: OrderStatus) {
  mocks.queryMock.mockResolvedValue([
    {
      id: 1,
      status: currentStatus,
      customer_id: "client-1",
      restaurant_id: 10,
      restaurant_owner_user_id: "restaurant-owner-1",
      driver_id: "driver-1"
    }
  ]);
}

function mockSuccessfulStatusUpdate(nextStatus: OrderStatus) {
  const clientQueryMock = vi.fn();
  clientQueryMock.mockResolvedValueOnce({
    rows: [
      {
        id: 1,
        status: nextStatus,
        updated_at: "2026-04-04T00:00:00.000Z"
      }
    ]
  });
  clientQueryMock.mockResolvedValueOnce({ rows: [] });

  mocks.withTransactionMock.mockImplementation(async (fn: (client: { query: typeof clientQueryMock }) => Promise<unknown>) =>
    fn({ query: clientQueryMock })
  );

  return clientQueryMock;
}

describe("orders routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      authUserId: "restaurant-owner-1",
      email: "restaurant@example.com",
      fullName: "Restaurant Owner",
      role: "restaurant",
      isActive: true
    };
    mocks.publishOrderStatusChangedMock.mockResolvedValue(undefined);
  });

  it("allows restaurant to accept a pending order", async () => {
    mockOrderContext("PENDING");
    const clientQueryMock = mockSuccessfulStatusUpdate("ACCEPTED");

    const response = await request(createApp())
      .patch("/orders/1/status")
      .send({ status: "ACCEPTED" });

    expect(response.status).toBe(200);
    expect(response.body.order.status).toBe("ACCEPTED");
    expect(clientQueryMock).toHaveBeenCalledTimes(2);
    expect(mocks.publishOrderStatusChangedMock).toHaveBeenCalledWith(1, "ACCEPTED");
  });

  it("rejects invalid transition (PENDING -> READY_FOR_PICKUP)", async () => {
    mockOrderContext("PENDING");

    const response = await request(createApp())
      .patch("/orders/1/status")
      .send({ status: "READY_FOR_PICKUP" });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Invalid transition");
    expect(mocks.withTransactionMock).not.toHaveBeenCalled();
  });

  it("blocks restaurant from setting driver-only statuses", async () => {
    mockOrderContext("IN_TRANSIT");

    const response = await request(createApp())
      .patch("/orders/1/status")
      .send({ status: "DELIVERED" });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Restaurant can set");
    expect(mocks.withTransactionMock).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown status values", async () => {
    const response = await request(createApp())
      .patch("/orders/1/status")
      .send({ status: "DONE" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Unknown order status.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });
});
