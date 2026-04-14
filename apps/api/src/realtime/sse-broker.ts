import type { Response } from "express";
import { randomUUID } from "node:crypto";

interface Subscriber {
  clientId: string;
  userId: string;
  response: Response;
}

class SseBroker {
  private readonly subscribers = new Map<string, Subscriber>();

  subscribe(userId: string, response: Response): string {
    const clientId = randomUUID();
    const subscriber: Subscriber = { clientId, userId, response };
    this.subscribers.set(clientId, subscriber);
    return clientId;
  }

  unsubscribe(clientId: string): void {
    this.subscribers.delete(clientId);
  }

  publishToUsers(userIds: string[], event: string, data: unknown): void {
    const serialized = JSON.stringify(data);
    const targets = new Set(userIds);
    for (const subscriber of this.subscribers.values()) {
      if (!targets.has(subscriber.userId)) continue;
      subscriber.response.write(`event: ${event}\n`);
      subscriber.response.write(`data: ${serialized}\n\n`);
    }
  }
}

export const sseBroker = new SseBroker();

