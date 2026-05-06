import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { OrderLocationEvent, OrderStatusEvent, OrderSummary } from '../core/models';
import { OrderEventsService } from '../core/order-events.service';
import { OrderMapComponent } from '../components/order-map.component';

@Component({
  selector: 'app-client-orders-page',
  standalone: true,
  imports: [CommonModule, OrderMapComponent],
  template: `
    <article class="card">
      <div class="card-header">
        <div class="card-header__left">
          <span class="step-badge">03</span>
          <h3>Mis pedidos</h3>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="loadOrders()" [disabled]="loadingOrders">
          @if (loadingOrders) { <span class="spinner"></span> Cargando... }
          @else { ↻ Recargar }
        </button>
      </div>

      @if (!orders.length) {
        <div class="empty-state">
          <span class="empty-state__icon">📦</span>
          <p>Aún no tienes pedidos. ¡Haz tu primer pedido!</p>
        </div>
      } @else {
        <ul class="order-list">
          @for (order of orders; track order.id) {
            <li class="order-item">
              <!-- Order header -->
              <div class="order-item__header">
                <div class="order-item__id">
                  <span class="order-num">#{{ order.id }}</span>
                  <span [class]="'status-pill ' + statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </div>
                <span class="order-total">\${{ order.total }}</span>
              </div>

              <!-- Driver location -->
              @if (hasDriverLocation(order)) {
                <div class="location-card">
                  <div class="location-card__header">
                    <span class="location-card__icon">📍</span>
                    <div>
                      <strong>Ubicación del repartidor</strong>
                      <span class="location-card__meta">
                        Actualizado {{ locationAge(order.location_updated_at) }}
                        @if (order.driver_accuracy !== null) {
                          · Precisión ~{{ order.driver_accuracy }} m
                        }
                      </span>
                    </div>
                    <span class="live-badge">EN VIVO</span>
                  </div>
                  <div class="map-wrapper">
                    <app-order-map [lat]="order.driver_latitude!" [lng]="order.driver_longitude!"></app-order-map>
                  </div>
                </div>
              } @else if (isInTransit(order.status)) {
                <div class="location-waiting">
                  <span class="spinner spinner--sm"></span>
                  <span>Esperando ubicación del repartidor...</span>
                </div>
              }

              <!-- Cancel button -->
              @if (canCancel(order.status)) {
                <button
                  type="button"
                  class="btn btn--danger btn--sm"
                  (click)="cancelOrder(order.id)"
                  [disabled]="cancellingOrderId === order.id"
                >
                  @if (cancellingOrderId === order.id) {
                    <span class="spinner spinner--white"></span>
                    Cancelando...
                  } @else {
                    ✕ Cancelar pedido
                  }
                </button>
              }
            </li>
          }
        </ul>
      }
    </article>

    @if (message) {
      <div class="alert alert--success">✓ {{ message }}</div>
    }
    @if (errorMessage) {
      <div class="alert alert--error">{{ errorMessage }}</div>
    }
  `,
  styles: `
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--panel);
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .card-header__left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    h3 { margin: 0; }

    .step-badge {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(248, 92, 35, 0.25);
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border: 0;
      border-radius: 999px;
      padding: 0.55rem 1rem;
      font-weight: 700;
      font-size: 0.88rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn--ghost {
      background: var(--surface-alt);
      border: 1px solid var(--line);
      color: var(--ink);
    }

    .btn--ghost:hover:not([disabled]) { border-color: var(--line-strong); }

    .btn--danger {
      background: var(--danger);
      color: #fff;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
    }

    .btn--danger:hover:not([disabled]) { box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3); }

    .btn--sm { padding: 0.38rem 0.8rem; font-size: 0.82rem; }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-7) 0;
      text-align: center;
    }

    .empty-state__icon { font-size: 2.5rem; }
    .empty-state p { margin: 0; color: var(--muted); font-size: 0.92rem; }

    /* ── Order list ── */
    .order-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }

    .order-item {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      padding: var(--space-4);
      display: grid;
      gap: var(--space-3);
    }

    .order-item__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .order-item__id {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .order-num {
      font-weight: 800;
      font-size: 0.95rem;
      color: var(--ink);
    }

    .order-total {
      font-weight: 800;
      font-size: 1rem;
      color: var(--ink);
    }

    /* ── Status pills ── */
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.18rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }

    .status-pill.pending    { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .status-pill.accepted   { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-pill.assigned   { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .status-pill.in-transit { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
    .status-pill.ready      { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
    .status-pill.delivered  { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
    .status-pill.rejected   { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .status-pill.cancelled  { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .status-pill.default    { background: var(--surface); color: var(--muted); border-color: var(--line); }

    /* ── Location card ── */
    .location-card {
      border: 1px solid rgba(248, 92, 35, 0.22);
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, rgba(255, 240, 232, 0.8), rgba(255, 255, 255, 0.9));
      overflow: hidden;
    }

    .location-card__header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3) 0;
      flex-wrap: wrap;
    }

    .location-card__icon { font-size: 1.4rem; line-height: 1; flex-shrink: 0; }

    .location-card__header > div {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: 0.18rem;
    }

    .location-card__header strong { font-size: 0.9rem; font-weight: 700; color: var(--ink); }
    .location-card__meta { font-size: 0.78rem; color: var(--muted); }

    .live-badge {
      flex-shrink: 0;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: rgba(248, 92, 35, 0.12);
      border: 1px solid rgba(248, 92, 35, 0.25);
      color: var(--primary-strong);
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .map-wrapper {
      margin-top: var(--space-3);
      width: 100%;
      border-radius: 0 0 var(--radius-sm) var(--radius-sm);
      overflow: hidden;
    }

    /* ── Location waiting ── */
    .location-waiting {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-xs);
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      font-size: 0.86rem;
      font-weight: 500;
    }

    /* ── Spinner ── */
    .spinner {
      width: 0.9rem;
      height: 0.9rem;
      border: 2px solid rgba(100, 60, 30, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    .spinner--sm { width: 0.8rem; height: 0.8rem; }
    .spinner--white { border-color: rgba(255,255,255,0.35); border-top-color: #fff; }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Alerts ── */
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .alert--success { background: var(--success-soft); border: 1px solid #a7f3d0; color: #065f46; }
    .alert--error { background: var(--danger-soft); border: 1px solid #fecaca; color: var(--danger); }
  `
})
export class ClientOrdersPageComponent implements OnDestroy {
  protected orders: OrderSummary[] = [];
  protected loadingOrders = false;
  protected cancellingOrderId: number | null = null;

  protected message = '';
  protected errorMessage = '';

  private eventSource: EventSource | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly orderEventsService: OrderEventsService
  ) {
    void this.boot();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'pending',
      ACCEPTED: 'accepted',
      ASSIGNED: 'assigned',
      IN_TRANSIT: 'in-transit',
      READY_FOR_PICKUP: 'ready',
      DELIVERED: 'delivered',
      REJECTED: 'rejected',
      CANCELLED: 'cancelled'
    };
    return map[status] ?? 'default';
  }

  protected canCancel(status: string): boolean {
    return ['PENDING', 'ACCEPTED'].includes(status);
  }

  protected hasDriverLocation(order: OrderSummary): boolean {
    return (
      typeof order.driver_latitude === 'number' &&
      typeof order.driver_longitude === 'number'
    );
  }

  protected isInTransit(status: string): boolean {
    return status === 'IN_TRANSIT';
  }

  protected locationAge(value: string | null): string {
    if (!value) return 'sin hora registrada';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'recientemente';

    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `hace ${seconds}s`;

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.round(minutes / 60);
    return `hace ${hours} h`;
  }

  protected async loadOrders(): Promise<void> {
    this.loadingOrders = true;
    this.errorMessage = '';
    try {
      this.orders = await this.apiService.getMyOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos.');
    } finally {
      this.loadingOrders = false;
    }
  }

  protected async cancelOrder(orderId: number): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.cancellingOrderId = orderId;
    try {
      await this.apiService.cancelOrder(orderId);
      this.message = `Pedido #${orderId} cancelado.`;
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cancelar el pedido.');
    } finally {
      this.cancellingOrderId = null;
    }
  }

  private async boot(): Promise<void> {
    await this.loadOrders();
    await this.connectEvents();
  }

  private async connectEvents(): Promise<void> {
    this.eventSource = await this.orderEventsService.connect({
      onConnected: () => {},
      onError: () => {},
      onOrderStatusChanged: (event: OrderStatusEvent) => {
        const found = this.orders.find((order) => order.id === event.orderId);
        if (found) {
          found.status = event.status;
        } else {
          void this.loadOrders();
        }
      },
      onOrderLocationChanged: (event: OrderLocationEvent) => {
        const found = this.orders.find((order) => order.id === event.orderId);
        if (!found) {
          void this.loadOrders();
          return;
        }

        found.driver_latitude = event.latitude;
        found.driver_longitude = event.longitude;
        found.driver_accuracy = event.accuracy;
        found.location_updated_at = event.at;
      }
    });
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string } | null;
      if (payload?.error) return payload.error;
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }

    if (error instanceof Error) return error.message;
    return fallback;
  }
}