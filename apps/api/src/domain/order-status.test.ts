import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  canTransition,
  isOrderStatus
} from "./order-status.js";

describe("order-status domain", () => {
  it("recognizes valid order statuses", () => {
    for (const status of ORDER_STATUSES) {
      expect(isOrderStatus(status)).toBe(true);
    }
  });

  it("rejects invalid order statuses", () => {
    expect(isOrderStatus("READY")).toBe(false);
    expect(isOrderStatus("DONE")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
  });

  it("allows valid transitions", () => {
    expect(canTransition("PENDING", "ACCEPTED")).toBe(true);
    expect(canTransition("PENDING", "REJECTED")).toBe(true);
    expect(canTransition("ACCEPTED", "READY_FOR_PICKUP")).toBe(true);
    expect(canTransition("READY_FOR_PICKUP", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "IN_TRANSIT")).toBe(true);
    expect(canTransition("IN_TRANSIT", "DELIVERED")).toBe(true);
  });

  it("blocks invalid transitions", () => {
    expect(canTransition("PENDING", "DELIVERED")).toBe(false);
    expect(canTransition("REJECTED", "ACCEPTED")).toBe(false);
    expect(canTransition("CANCELLED", "PENDING")).toBe(false);
    expect(canTransition("DELIVERED", "IN_TRANSIT")).toBe(false);
  });
});
