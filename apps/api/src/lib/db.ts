import { Pool } from "pg";
import { env } from "../config/env.js";

const isSupabase = env.DATABASE_URL.includes("supabase.com");
const ssl =
  env.NODE_ENV === "production" || isSupabase
    ? { rejectUnauthorized: false }
    : false;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl
});

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await pool.query<T>(sql, params);
  return rows;
}
