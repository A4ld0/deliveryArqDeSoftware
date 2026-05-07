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
    authUserId: "restaurant-owner-1",
    email: "restaurant@example.com",
    fullName: "Restaurant Owner",
    role: "restaurant",
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

import { restaurantsRouter } from "./restaurants.routes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/restaurants", restaurantsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("restaurants routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = {
      authUserId: "restaurant-owner-1",
      email: "restaurant@example.com",
      fullName: "Restaurant Owner",
      role: "restaurant",
      isActive: true
    };
  });

  it("lists restaurants using the search query", async () => {
    mocks.queryMock.mockResolvedValueOnce([
      {
        id: 10,
        name: "Tacos Norte 24",
        description: "Tacos y burritos",
        address: "Av. Mexico 123",
        phone: null,
        is_open: true,
        created_at: "2026-05-06T00:00:00.000Z"
      }
    ]);

    const response = await request(createApp()).get("/restaurants?search=tacos");

    expect(response.status).toBe(200);
    expect(response.body.restaurants[0].name).toBe("Tacos Norte 24");
    expect(mocks.queryMock).toHaveBeenCalledWith(expect.any(String), ["tacos"]);
  });

  it("returns 404 when the current restaurant profile does not exist", async () => {
    mocks.queryMock.mockResolvedValueOnce([]);

    const response = await request(createApp()).get("/restaurants/me");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("Restaurant profile not found");
  });

  it("creates a restaurant profile when the owner does not have one", async () => {
    mocks.queryMock.mockResolvedValueOnce([]);
    mocks.queryMock.mockResolvedValueOnce([restaurantRow()]);

    const response = await request(createApp()).put("/restaurants/me").send({
      name: "Tacos Norte 24",
      description: "Tacos y burritos",
      address: "Av. Mexico 123",
      phone: "3333333333",
      isOpen: true
    });

    expect(response.status).toBe(201);
    expect(response.body.restaurant.owner_user_id).toBe("restaurant-owner-1");
    expect(mocks.queryMock).toHaveBeenCalledTimes(2);
  });

  it("updates a restaurant profile when it already exists", async () => {
    mocks.queryMock.mockResolvedValueOnce([restaurantRow()]);
    mocks.queryMock.mockResolvedValueOnce([restaurantRow({ name: "Tacos Premium" })]);

    const response = await request(createApp()).put("/restaurants/me").send({
      name: "Tacos Premium",
      address: "Av. Mexico 123",
      isOpen: false
    });

    expect(response.status).toBe(200);
    expect(response.body.restaurant.name).toBe("Tacos Premium");
    expect(mocks.queryMock).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid product payloads before querying the database", async () => {
    const response = await request(createApp()).post("/restaurants/me/products").send({
      name: "A",
      price: -20
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid product payload.");
    expect(mocks.queryMock).not.toHaveBeenCalled();
  });

  it("creates a product for the owner restaurant", async () => {
    mocks.queryMock.mockResolvedValueOnce([restaurantRow()]);
    mocks.queryMock.mockResolvedValueOnce([productRow()]);

    const response = await request(createApp()).post("/restaurants/me/products").send({
      name: "Taco de arrachera",
      description: "Tortilla de maiz con arrachera",
      price: 49,
      category: "Tacos",
      imageUrl: "https://example.com/taco.jpg",
      available: true
    });

    expect(response.status).toBe(201);
    expect(response.body.product.restaurant_id).toBe(10);
    expect(mocks.queryMock).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when updating a product outside the owner restaurant", async () => {
    mocks.queryMock.mockResolvedValueOnce([restaurantRow()]);
    mocks.queryMock.mockResolvedValueOnce([]);

    const response = await request(createApp())
      .patch("/restaurants/me/products/99")
      .send({ available: false });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Product not found for this restaurant.");
  });
});

function restaurantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    owner_user_id: "restaurant-owner-1",
    name: "Tacos Norte 24",
    description: "Tacos y burritos",
    address: "Av. Mexico 123",
    phone: "3333333333",
    is_open: true,
    created_at: "2026-05-06T00:00:00.000Z",
    updated_at: "2026-05-06T00:00:00.000Z",
    ...overrides
  };
}

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    restaurant_id: 10,
    name: "Taco de arrachera",
    description: "Tortilla de maiz con arrachera",
    price: "49.00",
    category: "Tacos",
    image_url: "https://example.com/taco.jpg",
    available: true,
    created_at: "2026-05-06T00:00:00.000Z",
    ...overrides
  };
}
