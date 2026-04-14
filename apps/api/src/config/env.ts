import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/delivery"),
  CORS_ORIGIN: z.string().default("http://localhost:4200"),
  SUPABASE_JWKS_URL: z
    .string()
    .url()
    .default("https://example.supabase.co/auth/v1/.well-known/jwks.json"),
  SUPABASE_JWT_ISSUER: z
    .string()
    .url()
    .default("https://example.supabase.co/auth/v1"),
  SUPABASE_JWT_AUDIENCE: z.string().default("authenticated")
});

export const env = EnvSchema.parse(process.env);

