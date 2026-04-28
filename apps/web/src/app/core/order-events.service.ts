import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import type { OrderLocationEvent, OrderStatusEvent } from './models';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class OrderEventsService {
  constructor(private readonly sessionService: SessionService) {}

  async connect(
    handlers: {
      onOrderStatusChanged: (event: OrderStatusEvent) => void;
      onOrderLocationChanged?: (event: OrderLocationEvent) => void;
      onError?: () => void;
      onConnected?: () => void;
    }
  ): Promise<EventSource | null> {
    await this.sessionService.waitUntilReady();
    const token = this.sessionService.getAccessToken();
    if (!token) return null;

    const url = `${environment.apiBaseUrl}/events/stream?access_token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.addEventListener('connection', () => {
      handlers.onConnected?.();
    });

    source.addEventListener('order.status_changed', (raw) => {
      if (!(raw instanceof MessageEvent)) return;
      try {
        const payload = JSON.parse(raw.data) as OrderStatusEvent;
        handlers.onOrderStatusChanged(payload);
      } catch {
        // Ignore malformed payloads.
      }
    });

    source.addEventListener('order.location_changed', (raw) => {
      if (!(raw instanceof MessageEvent)) return;
      try {
        const payload = JSON.parse(raw.data) as OrderLocationEvent;
        handlers.onOrderLocationChanged?.(payload);
      } catch {
        // Ignore malformed payloads.
      }
    });

    source.onerror = () => {
      handlers.onError?.();
    };

    return source;
  }
}
