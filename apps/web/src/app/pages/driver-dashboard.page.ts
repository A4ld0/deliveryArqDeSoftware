import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
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

      <article class="gps-card">
        <div>
          <h3>GPS de entrega</h3>
          <p class="muted">
            {{ gpsSupported ? 'Comparte tu ubicacion cuando inicies una ruta.' : 'GPS no disponible en este navegador.' }}
          </p>
          @if (lastGpsUpdate) {
            <span class="gps-meta">
              Ultima ubicacion: {{ lastGpsUpdate.at }} - Precision: {{ lastGpsUpdate.accuracy ?? 'N/D' }} m
            </span>
          }
        </div>
        <div class="gps-actions">
          <span class="gps-status" [class.active]="trackingOrderId">
            {{ trackingOrderId ? 'Activo' : 'Inactivo' }}
          </span>
          @if (trackingOrderId) {
            <button type="button" class="ghost" (click)="stopGpsTracking()">Detener GPS</button>
          }
        </div>
      </article>

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
                      [disabled]="updatingOrderId === order.id || !gpsSupported"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Iniciar ruta y GPS' }}
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
    .card,
    .gps-card { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 0.9rem; margin-top: 0.9rem; }
    .gps-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .gps-card h3 { margin: 0; }
    .gps-meta { color: var(--muted); font-size: 0.86rem; }
    .gps-actions { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
    .gps-status {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--muted);
      padding: 0.35rem 0.65rem;
      font-weight: 700;
      font-size: 0.82rem;
    }
    .gps-status.active {
      border-color: #0f8a71;
      color: #0f7665;
      background: #e6fff8;
    }
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
export class DriverDashboardPageComponent implements OnDestroy {
  protected available: DeliveryAvailable[] = [];
  protected myOrders: OrderSummary[] = [];
  protected loadingAvailable = false;
  protected loadingMyOrders = false;
  protected takingOrderId: number | null = null;
  protected updatingOrderId: number | null = null;
  protected message = '';
  protected errorMessage = '';
  protected readonly gpsSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;
  protected trackingOrderId: number | null = null;
  protected lastGpsUpdate: { accuracy: number | null; at: string } | null = null;

  private gpsWatchId: number | null = null;
  private lastLocationSentAt = 0;

  constructor(private readonly apiService: ApiService) {
    void this.boot();
  }

  ngOnDestroy(): void {
    this.stopGpsTracking();
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
      let initialPosition: GeolocationPosition | null = null;
      if (status === 'IN_TRANSIT') {
        initialPosition = await this.getCurrentPosition();
      }

      await this.apiService.updateDeliveryStatus(orderId, status);
      if (initialPosition) {
        await this.sendDeliveryLocation(orderId, initialPosition);
        this.startGpsTracking(orderId);
      }
      if (status === 'DELIVERED' && this.trackingOrderId === orderId) {
        this.stopGpsTracking();
      }
      this.message = `Pedido #${orderId} actualizado a ${status}.`;
      await Promise.all([this.loadAvailable(), this.loadMyOrders()]);
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar la entrega.');
    } finally {
      this.updatingOrderId = null;
    }
  }

  protected stopGpsTracking(): void {
    if (this.gpsWatchId !== null && this.gpsSupported) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
    }
    this.gpsWatchId = null;
    this.trackingOrderId = null;
    this.lastLocationSentAt = 0;
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadAvailable(), this.loadMyOrders()]);
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    if (!this.gpsSupported) {
      return Promise.reject(new Error('GPS no disponible en este navegador.'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000
      });
    });
  }

  private startGpsTracking(orderId: number): void {
    if (!this.gpsSupported) return;
    this.stopGpsTracking();
    this.trackingOrderId = orderId;
    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - this.lastLocationSentAt < 15000) return;
        void this.sendDeliveryLocation(orderId, position).catch((error) => {
          this.errorMessage = this.toErrorMessage(error, 'No se pudo enviar ubicacion.');
        });
      },
      (error) => {
        this.errorMessage = this.locationErrorMessage(error);
        this.stopGpsTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }

  private async sendDeliveryLocation(
    orderId: number,
    position: GeolocationPosition
  ): Promise<void> {
    const payload = {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
      accuracy: Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : null
    };

    await this.apiService.updateDeliveryLocation(orderId, payload);
    this.lastLocationSentAt = Date.now();
    this.lastGpsUpdate = {
      accuracy: payload.accuracy,
      at: new Date().toLocaleTimeString()
    };
  }

  private locationErrorMessage(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Permiso de ubicacion denegado. Activa GPS para iniciar ruta.';
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'No se pudo obtener tu ubicacion actual.';
    }
    if (error.code === error.TIMEOUT) {
      return 'El GPS tardo demasiado en responder. Intenta de nuevo.';
    }
    return error.message || 'No se pudo obtener ubicacion.';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string; details?: unknown } | null;
      if (payload?.error) return payload.error;
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }
    if (this.isGeolocationError(error)) {
      return this.locationErrorMessage(error);
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }

  private isGeolocationError(error: unknown): error is GeolocationPositionError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error
    );
  }
}
