import { query } from "../lib/db.js";
import { sseBroker } from "./sse-broker.js";

interface OrderAudienceRow {
  [key: string]: unknown;
  customer_id: string;
  owner_user_id: string;
  driver_id: string | null;
}

export async function publishOrderStatusChanged(
  orderId: number,
  status: string
): Promise<void> {
  const rows = await query<OrderAudienceRow>(
    `
    SELECT
      o.customer_id,
      r.owner_user_id,
      d.driver_id
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    LEFT JOIN deliveries d ON d.order_id = o.id
    WHERE o.id = $1
    `,
    [orderId]
  );

  const audience = rows[0];
  if (!audience) return;

  const userIds = [
    audience.customer_id,
    audience.owner_user_id,
    audience.driver_id
  ].filter((value): value is string => Boolean(value));

  sseBroker.publishToUsers(userIds, "order.status_changed", {
    orderId,
    status,
    at: new Date().toISOString()
  });
}
