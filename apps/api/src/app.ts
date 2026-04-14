import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { deliveriesRouter } from "./modules/deliveries/deliveries.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { incidentsRouter } from "./modules/incidents/incidents.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { restaurantsRouter } from "./modules/restaurants/restaurants.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/", (_request, response) => {
  response.json({
    name: "delivery-api",
    version: "0.1.0"
  });
});

app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/events", eventsRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/orders", ordersRouter);
app.use("/deliveries", deliveriesRouter);
app.use("/incidents", incidentsRouter);
app.use("/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

