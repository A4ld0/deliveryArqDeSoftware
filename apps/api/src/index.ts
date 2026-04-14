import { env } from "./config/env.js";
import { pool } from "./lib/db.js";
import { app } from "./app.js";

async function bootstrap() {
  try {
    await pool.query("SELECT 1");
    // eslint-disable-next-line no-console
    console.log("Database connection successful.");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Database connection failed at startup.", error);
  }

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error.", error);
  process.exit(1);
});

