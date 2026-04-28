import express from "express";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "../../domain/current-user.js";
import { errorHandler } from "../../middlewares/error-handler.js";
import { notFoundHandler } from "../../middlewares/not-found.js";

const mocks = vi.hoisted(() => {
  return {
    queryMock: vi.fn(),
    withTransactionMock: vi.fn(),
    publishDeliveryLocationChangedMock: vi.fn(),
    publishOrderStatusChangedMock: vi.fn(),
    currentUser: {
      authUserId: "driver-1",
      email: "driver@example.com",
      fullName: "Driver One",
      role: "driver",
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
  publishDeliveryLocationChanged: mocks.publishDeliveryLocationChangedMock,
  publishOrderStatusChanged: mocks.publishOrderStatusChangedMock
}));

import { deliveriesRouter } from "./deliveries.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/deliveries", deliveriesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("deliveries routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      authUserId: "driver-1",
      email: "driver@example.com",
      fullName: "Driver One",
      role: "driver",
      isActive: true
    };
    mocks.publishDeliveryLocationChangedMock.mockResolvedValue(undefined);
  });

  it("allows assigned drivers to update delivery location", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        order_id: 1,
        driver_id: "driver-1",
        status: "IN_TRANSIT",
        driver_latitude: 20.676,
        driver_longitude: -103.347,
        driver_accuracy: 18,
        location_updated_at: "2026-04-04T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp())
      .post("/deliveries/1/location")
      .send({ latitude: 20.676, longitude: -103.347, accuracy: 18 });

    expect(response.status).toBe(200);
    expect(response.body.delivery.driver_latitude).toBe(20.676);
    expect(mocks.queryMock).toHaveBeenCalledTimes(1);
    expect(mocks.publishDeliveryLocationChangedMock).toHaveBeenCalledWith(1, {
      latitude: 20.676,
      longitude: -103.347,
      accuracy: 18
    });
  });

  it("rejects invalid coordinates", async () => {
    const response = await request(createApp())
      .post("/deliveries/1/location")
      .send({ latitude: 120, longitude: -103.347 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid delivery location payload.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
    expect(mocks.publishDeliveryLocationChangedMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the driver has no active assignment", async () => {
    mocks.queryMock.mockResolvedValueOnce([]);

    const response = await request(createApp())
      .post("/deliveries/99/location")
      .send({ latitude: 20.676, longitude: -103.347 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Active delivery assignment not found.");
    expect(mocks.publishDeliveryLocationChangedMock).not.toHaveBeenCalled();
  });
});
