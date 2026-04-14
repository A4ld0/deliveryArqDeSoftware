import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { OrderStatusEvent, OrderSummary } from '../core/models';
import { OrderEventsService } from '../core/order-events.service';

@Component({
  selector: 'app-client-orders-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card">
      <div class="card-title">
        <h3>Mis pedidos</h3>
        <button type="button" class="ghost" (click)="loadOrders()" [disabled]="loadingOrders">
          {{ loadingOrders ? 'Cargando...' : 'Recargar' }}
        </button>
      </div>

      @if (!orders.length) {
        <p class="muted">Aun no tienes pedidos.</p>
      } @else {
        <ul class="list">
          @for (order of orders; track order.id) {
            <li>
              <div class="row">
                <strong>#{{ order.id }} - {{ order.status }}</strong>
                <span>Total: {{ order.total }}</span>
              </div>
              @if (canCancel(order.status)) {
                <button
                  type="button"
                  class="danger"
                  (click)="cancelOrder(order.id)"
                  [disabled]="cancellingOrderId === order.id"
                >
                  {{ cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido' }}
                </button>
              }
            </li>
          }
        </ul>
      }
    </article>

    @if (message) {
      <p class="message">{{ message }}</p>
    }
    @if (errorMessage) {
      <p class="error">{{ errorMessage }}</p>
    }
  `,
  styles: `
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--panel);
      padding: var(--space-5);
      margin: 0;
      box-shadow: var(--shadow-sm);
    }
    .card-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .card-title h3 { margin: 0; }
    .list { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: grid; gap: var(--space-3); }
    .list li {
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      padding: var(--space-3);
      display: grid;
      gap: var(--space-2);
    }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 0.58rem 0.92rem;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-weight: 700;
    }
    .ghost { background: var(--surface); border: 1px solid var(--line); color: var(--ink); font-weight: 600; }
    .danger { background: var(--danger); }
    .muted { color: var(--muted); margin-top: var(--space-2); }
    .message { color: var(--primary); font-weight: 700; margin-top: var(--space-4); }
    .error { color: var(--danger); font-weight: 700; margin-top: var(--space-4); }
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

  protected canCancel(status: string): boolean {
    return ['PENDING', 'ACCEPTED'].includes(status);
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
