import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { DeliveryAvailable, OrderSummary } from '../core/models';

@Component({
  selector: 'app-driver-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Modulo Repartidor</h2>
      <p>Acepta pedidos listos para recoger y actualiza su entrega.</p>

      <article class="card">
        <div class="card-title">
          <h3>Pedidos disponibles</h3>
          <button type="button" class="ghost" (click)="loadAvailable()" [disabled]="loadingAvailable">
            {{ loadingAvailable ? 'Cargando...' : 'Recargar disponibles' }}
          </button>
        </div>

        @if (!available.length) {
          <p class="muted">No hay pedidos listos para recoger.</p>
        } @else {
          <ul class="list">
            @for (item of available; track item.id) {
              <li>
                <strong>Pedido #{{ item.id }}</strong>
                <span>Estado: {{ item.status }}</span>
                <span>Total: {{ item.total }}</span>
                <span>Direccion: {{ item.delivery_address }}</span>
                <button
                  type="button"
                  (click)="acceptDelivery(item.id)"
                  [disabled]="takingOrderId === item.id"
                >
                  {{ takingOrderId === item.id ? 'Aceptando...' : 'Tomar entrega' }}
                </button>
              </li>
            }
          </ul>
        }
      </article>

      <article class="card">
        <div class="card-title">
          <h3>Mis entregas</h3>
          <button type="button" class="ghost" (click)="loadMyOrders()" [disabled]="loadingMyOrders">
            {{ loadingMyOrders ? 'Cargando...' : 'Recargar mis entregas' }}
          </button>
        </div>

        @if (!myOrders.length) {
          <p class="muted">Aun no tienes pedidos asignados.</p>
        } @else {
          <ul class="list">
            @for (order of myOrders; track order.id) {
              <li>
                <strong>Pedido #{{ order.id }}</strong>
                <span>Estado: {{ order.status }}</span>
                <span>Total: {{ order.total }}</span>
                <div class="actions">
                  @if (canStartTransit(order.status)) {
                    <button
                      type="button"
                      (click)="updateDeliveryStatus(order.id, 'IN_TRANSIT')"
                      [disabled]="updatingOrderId === order.id"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Iniciar ruta' }}
                    </button>
                  }
                  @if (canDeliver(order.status)) {
                    <button
                      type="button"
                      (click)="updateDeliveryStatus(order.id, 'DELIVERED')"
                      [disabled]="updatingOrderId === order.id"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Marcar entregado' }}
                    </button>
                  }
                </div>
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
    </section>
  `,
  styles: `
    .page { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1.25rem; }
    p { color: var(--muted); }
    .card { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 0.9rem; margin-top: 0.9rem; }
    .card-title { display: flex; justify-content: space-between; align-items: center; gap: 0.7rem; }
    .card-title h3 { margin: 0; }
    .error { color: var(--danger); font-weight: 600; margin-top: 0.9rem; }
    .message { color: var(--primary); font-weight: 600; margin-top: 0.9rem; }
    .muted { margin-top: 1rem; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    .ghost { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
    .list { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.45rem; }
    .list li {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.45rem 0.55rem;
      background: var(--surface);
      display: grid;
      gap: 0.2rem;
    }
    .list li span { color: var(--muted); font-size: 0.9rem; }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.2rem; }
  `
})
export class DriverDashboardPageComponent {
  protected available: DeliveryAvailable[] = [];
  protected myOrders: OrderSummary[] = [];
  protected loadingAvailable = false;
  protected loadingMyOrders = false;
  protected takingOrderId: number | null = null;
  protected updatingOrderId: number | null = null;
  protected message = '';
  protected errorMessage = '';

  constructor(private readonly apiService: ApiService) {
    void this.boot();
  }

  protected async loadAvailable(): Promise<void> {
    this.loadingAvailable = true;
    this.errorMessage = '';
    try {
      this.available = await this.apiService.getAvailableDeliveries();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos disponibles.');
    } finally {
      this.loadingAvailable = false;
    }
  }

  protected async loadMyOrders(): Promise<void> {
    this.loadingMyOrders = true;
    this.errorMessage = '';
    try {
      this.myOrders = await this.apiService.getMyOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar tus entregas.');
    } finally {
      this.loadingMyOrders = false;
    }
  }

  protected canStartTransit(status: string): boolean {
    return status === 'ASSIGNED';
  }

  protected canDeliver(status: string): boolean {
    return status === 'IN_TRANSIT';
  }

  protected async acceptDelivery(orderId: number): Promise<void> {
    this.takingOrderId = orderId;
    this.errorMessage = '';
    this.message = '';
    try {
      await this.apiService.acceptDelivery(orderId);
      this.message = `Entrega del pedido #${orderId} aceptada.`;
      await Promise.all([this.loadAvailable(), this.loadMyOrders()]);
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo aceptar la entrega.');
    } finally {
      this.takingOrderId = null;
    }
  }

  protected async updateDeliveryStatus(
    orderId: number,
    status: 'IN_TRANSIT' | 'DELIVERED'
  ): Promise<void> {
    this.updatingOrderId = orderId;
    this.errorMessage = '';
    this.message = '';
    try {
      await this.apiService.updateDeliveryStatus(orderId, status);
      this.message = `Pedido #${orderId} actualizado a ${status}.`;
      await Promise.all([this.loadAvailable(), this.loadMyOrders()]);
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar la entrega.');
    } finally {
      this.updatingOrderId = null;
    }
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadAvailable(), this.loadMyOrders()]);
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string; details?: unknown } | null;
      if (payload?.error) return payload.error;
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }
}
