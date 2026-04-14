export const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["READY_FOR_PICKUP", "CANCELLED"],
  REJECTED: [],
  READY_FOR_PICKUP: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

