import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { sseBroker } from "../../realtime/sse-broker.js";

export const eventsRouter = Router();

eventsRouter.get("/stream", requireAuth, (request, response) => {
  const user = request.currentUser;
  if (!user) {
    response.status(403).json({
      error: "User profile is required before subscribing to events."
    });
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  const clientId = sseBroker.subscribe(user.authUserId, response);
  response.write(`event: connection\n`);
  response.write(
    `data: ${JSON.stringify({
      status: "connected",
      userId: user.authUserId
    })}\n\n`
  );

  const heartbeat = setInterval(() => {
    response.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
  }, 30000);

  request.on("close", () => {
    clearInterval(heartbeat);
    sseBroker.unsubscribe(clientId);
  });
});
