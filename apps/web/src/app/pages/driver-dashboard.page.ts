import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ProfileService } from '../core/profile.service';
import type { DeliveryAvailable, OrderSummary } from '../core/models';

@Component({
  selector: 'app-driver-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page anim-fade-in">
      <!-- HEADER -->
      <header class="page-header">
        <div class="page-header__icon">
          @if (isHistory()) { 📜 } @else { 🛵 }
        </div>
        <div class="page-header__text">
          <h2>¡Hola, {{ profile()?.fullName || 'Repartidor' }}!</h2>
          <p>{{ isHistory() ? 'Revisa tus servicios completados' : 'Gestiona tus pedidos activos y GPS' }}</p>
        </div>
      </header>

      @if (driverStats()) {
        <div class="stats-bar anim-slide-up">
          <div class="stat-item">
            <span class="stat-item__val">{{ driverStats()?.total_delivered }}</span>
            <span class="stat-item__label">Entregas</span>
          </div>
          <div class="stat-item">
            <span class="stat-item__val">\${{ driverStats()?.total_earnings }}</span>
            <span class="stat-item__label">Ganancias</span>
          </div>
        </div>
      }

      @if (errorMessage) {
        <div class="alert alert--error anim-shake">
          <span>{{ errorMessage }}</span>
        </div>
      }

      @if (message) {
        <div class="alert alert--success anim-slide-up">
          <span>{{ message }}</span>
        </div>
      }

      @if (!isHistory()) {
        <!-- GPS SECTION -->
        <section class="gps-card" [class.gps-card--tracking]="trackingOrderId">
          <div class="gps-card__left">
            <div class="gps-icon" [class.tracking]="trackingOrderId">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <h3>Transmisión de Ubicación</h3>
              <p>{{ trackingOrderId ? 'Transmitiendo GPS en tiempo real' : 'El GPS se activa al iniciar una entrega' }}</p>
            </div>
          </div>
          <div class="gps-status-pill" [class.active]="trackingOrderId">
            <span class="gps-status-dot"></span>
            {{ trackingOrderId ? 'EN VIVO' : 'INACTIVO' }}
          </div>
        </section>

        <!-- Available deliveries -->
        <article class="card">
          <div class="card-header">
            <h3>Pedidos disponibles</h3>
            <button class="btn btn--ghost btn--sm" (click)="loadAvailable()" [disabled]="loadingAvailable">
              @if (loadingAvailable) { <span class="spinner"></span> } @else { ↻ }
            </button>
          </div>

          @if (loadingAvailable && !available().length) {
            <div class="empty-state"><span class="spinner spinner--lg"></span></div>
          } @else if (!available().length) {
            <div class="empty-state">
              <span class="empty-state__icon">🚲</span>
              <p>No hay pedidos cercanos en este momento.</p>
            </div>
          } @else {
            <ul class="delivery-list">
              @for (item of available(); track item.id) {
                <li class="delivery-card anim-slide-up">
                  <div class="delivery-card__header">
                    <span class="order-num">#{{ item.id }}</span>
                    <span class="delivery-total">\${{ item.total }}</span>
                  </div>
                  <div class="delivery-card__address">
                    📍 {{ item.delivery_address }}
                  </div>
                  <button class="btn btn--primary btn--full" (click)="acceptDelivery(item.id)" [disabled]="takingOrderId === item.id">
                    @if (takingOrderId === item.id) { <span class="spinner spinner--white"></span> } @else { Aceptar Entrega }
                  </button>
                </li>
              }
            </ul>
          }
        </article>
      }

      <!-- My active/history deliveries -->
      <article class="card">
        <div class="card-header">
          <div class="card-header__left">
            <h3>{{ isHistory() ? 'Servicios Completados' : 'Mis entregas activas' }}</h3>
            @if (filteredOrders().length) {
              <span class="count-badge">{{ filteredOrders().length }}</span>
            }
          </div>
          <button type="button" class="btn btn--ghost btn--sm" (click)="loadMyOrders()" [disabled]="loadingMyOrders">
            @if (loadingMyOrders) { <span class="spinner"></span> } @else { ↻ }
          </button>
        </div>

        @if (loadingMyOrders && !filteredOrders().length) {
          <div class="empty-state"><span class="spinner spinner--lg"></span></div>
        } @else if (!filteredOrders().length) {
          <div class="empty-state">
            <span class="empty-state__icon">📦</span>
            <p>{{ isHistory() ? 'Aún no tienes entregas en tu historial.' : 'No tienes entregas activas.' }}</p>
          </div>
        } @else {
          <ul class="order-list">
            @for (order of filteredOrders(); track order.id) {
              <li class="order-item" [class.order-item--active]="trackingOrderId === order.id">
                <div class="order-item__header">
                  <div class="order-item__id">
                    <span class="order-num">Pedido #{{ order.id }}</span>
                    <span [class]="'status-pill ' + statusClass(order.status)">
                      {{ statusLabel(order.status) }}
                    </span>
                    @if (trackingOrderId === order.id) { <span class="live-badge">GPS EN VIVO</span> }
                  </div>
                  <div class="order-item__prices">
                    <span class="order-total">\${{ order.total }}</span>
                    <span class="order-fee">Comisión: \${{ order.delivery_fee }}</span>
                  </div>
                </div>

                <div class="delivery-details">
                  <!-- PICKUP PHASE -->
                  <div class="detail-row" [class.detail-row--pending]="order.status === 'ASSIGNED'">
                    <div class="detail-icon">🏪</div>
                    <div class="detail-text">
                      <small>Punto de Recolección (Restaurante)</small>
                      <strong>{{ order.restaurant_name }}</strong>
                      <span>{{ order.restaurant_address }}</span>
                    </div>
                  </div>

                  <!-- DELIVERY PHASE -->
                  <div class="detail-row" [class.detail-row--active]="order.status === 'IN_TRANSIT'">
                    <div class="detail-icon">🏠</div>
                    <div class="detail-text">
                      <small>Punto de Entrega (Cliente)</small>
                      <strong>{{ order.customer_name || 'Cliente' }}</strong>
                      <span>{{ order.delivery_address }}</span>
                    </div>
                  </div>
                </div>

                @if (!isHistory() && canDeliver(order.status)) {
                  <div class="delivery-proof-zone anim-slide-down">
                    <input type="file" #fileInput hidden (change)="onFileSelected($event, order.id)" accept="image/*">
                    <div class="proof-box" (click)="fileInput.click()">
                      <div class="proof-icon">📸</div>
                      <span>Subir Evidencia de Entrega</span>
                      <p>Toma una foto al entregar el pedido</p>
                    </div>
                  </div>
                }
                <div class="order-item__tray">
                  <button class="tray-toggle" (click)="toggleItems(order.id)">
                    {{ expandedOrderId() === order.id ? 'Ocultar detalles' : 'Ver productos' }}
                    <span class="chevron" [class.expanded]="expandedOrderId() === order.id">▼</span>
                  </button>

                  @if (expandedOrderId() === order.id) {
                    <div class="tray-content anim-fade-in">
                      @if (!itemsMap()[order.id]) {
                        <div class="tray-loader">Cargando...</div>
                      } @else {
                        @for (item of itemsMap()[order.id]; track item.id) {
                          <div class="tray-item">
                            <span class="item-qty">{{ item.quantity }}x</span>
                            <span class="item-name">{{ item.product_name }}</span>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>

                <div class="order-item__actions">
                  @if (!isHistory()) {
                    @if (canStartTransit(order.status)) {
                      <button class="btn btn--primary btn--full" (click)="updateDeliveryStatus(order.id, 'IN_TRANSIT')" [disabled]="updatingOrderId === order.id || !gpsSupported">
                        @if (updatingOrderId === order.id) { <span class="spinner spinner--white"></span> } @else { 🛵 Iniciar Ruta y GPS }
                      </button>
                    }
                    @if (canDeliver(order.status)) {
                      <button class="btn btn--success btn--full" (click)="updateDeliveryStatus(order.id, 'DELIVERED')" [disabled]="updatingOrderId === order.id">
                        @if (updatingOrderId === order.id) { <span class="spinner spinner--white"></span> } @else { ✅ Confirmar Entrega }
                      </button>
                    }
                  } @else {
                    <div class="delivered-date">
                      Entregado el {{ order.updated_at | date:'short' }}
                    </div>
                  }
                </div>
              </li>
            }
          </ul>
        }
      </article>
    </div>
  `,
  styles: `
    .page { display: grid; gap: 2rem; padding: 1.5rem; }
    .page-header { display: flex; align-items: center; gap: 1.5rem; }
    .page-header__icon { font-size: 2.5rem; }
    .page-header h2 { font-size: 1.8rem; font-weight: 900; margin: 0; }
    .page-header p { margin: 0; color: var(--muted); }

    .gps-card { border: 1.5px solid var(--line); border-radius: 28px; background: white; padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; }
    .gps-card__left { display: flex; align-items: center; gap: 1.5rem; }
    .gps-icon { width: 3rem; height: 3rem; border-radius: 16px; background: var(--bg-app); display: grid; place-items: center; color: var(--muted); }
    .gps-icon.tracking { background: #f0fdf4; color: #15803d; border: 1.5px solid #bbf7d0; }
    .gps-status-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 99px; font-weight: 800; font-size: 0.8rem; background: var(--bg-app); border: 1.5px solid var(--line); }
    .gps-status-pill.active { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .gps-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

    .card { border: 1.5px solid var(--line); border-radius: 28px; background: white; padding: 2rem; display: grid; gap: 1.5rem; }
    .card-header { display: flex; align-items: center; justify-content: space-between; }
    .card-header h3 { font-size: 1.2rem; font-weight: 850; margin: 0; }
    .count-badge { padding: 0.2rem 0.8rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; background: var(--bg-app); border: 1.5px solid var(--line); }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem; border: 0; border-radius: 99px; padding: 0.8rem 1.5rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
    .btn--primary { background: var(--primary); color: white; }
    .btn--success { background: #22c55e; color: white; }
    .btn--ghost { background: transparent; border: 1.5px solid var(--line); color: var(--muted); }
    .btn--full { width: 100%; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .delivery-list, .order-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
    .delivery-card, .order-item { border: 1.5px solid var(--line); border-radius: 24px; padding: 1.5rem; background: #fafafa; display: grid; gap: 1rem; }
    .order-item--active { border-color: var(--primary); background: white; }
    
    .delivery-card__header, .order-item__header { display: flex; justify-content: space-between; align-items: center; }
    .order-num { font-weight: 900; }
    .delivery-total { font-weight: 900; color: var(--primary); }
    
    .status-pill { padding: 0.3rem 0.8rem; border-radius: 99px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
    .status-pill.ready { background: #f0fdf4; color: #15803d; }
    .status-pill.assigned { background: #eff6ff; color: #1e3a8a; }
    .status-pill.in-transit { background: #fefce8; color: #854d0e; }
    .status-pill.delivered { background: #f0fdf4; color: #166534; }

    .delivery-details { display: grid; gap: 1.2rem; }
    .detail-row { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border-radius: 16px; background: var(--bg-app); border: 1.5px solid transparent; transition: 0.2s; }
    .detail-row--pending { border-color: var(--primary); background: white; box-shadow: 0 4px 15px var(--primary-soft); }
    .detail-row--active { border-color: #22c55e; background: white; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.1); }
    
    .detail-icon { width: 36px; height: 36px; border-radius: 12px; background: white; display: grid; place-items: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .detail-text { display: grid; }
    .detail-text small { font-size: 0.65rem; color: var(--muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
    .detail-text strong { font-size: 0.95rem; color: var(--ink); }
    .detail-text span { font-size: 0.85rem; color: var(--muted); }

    .delivery-proof-zone { padding: 1.5rem; border: 2px dashed var(--line); border-radius: 20px; background: var(--bg-app); cursor: pointer; text-align: center; }
    .proof-icon { font-size: 2rem; opacity: 0.4; }
    .proof-box span { font-weight: 800; }
    .proof-box p { margin: 0; font-size: 0.8rem; color: var(--muted); }

    .delivered-date { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
    .spinner { width: 1rem; height: 1rem; border: 2px solid rgba(0,0,0,0.1); border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* ── STATS BAR ── */
    .stats-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
    .stat-item { background: white; padding: 1.5rem; border-radius: 24px; border: 1.5px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .stat-item__val { font-size: 1.5rem; font-weight: 900; color: var(--ink); }
    .stat-item__label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }

    .order-item__prices { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
    .order-fee { font-size: 0.8rem; font-weight: 800; color: var(--primary); background: var(--primary-soft); padding: 2px 8px; border-radius: 6px; }

    /* ── ITEM TRAY ── */
    .order-item__tray { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin: 0 -1.5rem; }
    .tray-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: none; border: none; font-weight: 700; color: var(--muted); cursor: pointer; font-size: 0.85rem; }
    .tray-toggle:hover { color: var(--ink); background: var(--bg-app); }
    .chevron { font-size: 0.7rem; transition: transform 0.2s; color: var(--line-strong); }
    .chevron.expanded { transform: rotate(180deg); }
    .tray-content { padding: 0.5rem 1.5rem 1.5rem; display: grid; gap: 0.5rem; background: var(--bg-app); }
    .tray-item { display: flex; align-items: center; gap: 0.8rem; font-size: 0.9rem; font-weight: 600; }
    .item-qty { background: var(--line); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; }
    .tray-loader { padding: 1rem; text-align: center; color: var(--muted); font-size: 0.8rem; }

    .alert { padding: 1rem 1.5rem; border-radius: 20px; font-weight: 700; display: flex; align-items: center; }
    .alert--success { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #15803d; }
    .alert--error { background: #fef2f2; border: 1.5px solid #fee2e2; color: #b91c1c; }
  `
})
export class DriverDashboardPageComponent implements OnDestroy {
  protected available = signal<DeliveryAvailable[]>([]);
  protected myOrders = signal<OrderSummary[]>([]);
  protected loadingAvailable = false;
  protected loadingMyOrders = false;
  protected takingOrderId: number | null = null;
  protected updatingOrderId: number | null = null;
  protected message = '';
  protected errorMessage = '';
  protected driverStats = signal<{ total_delivered: number; total_earnings: string } | null>(null);
  protected itemsMap = signal<Record<number, any[]>>({});
  protected expandedOrderId = signal<number | null>(null);
  protected readonly gpsSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  protected trackingOrderId: number | null = null;
  protected lastGpsUpdate: { accuracy: number | null; at: string } | null = null;

  private gpsWatchId: number | null = null;
  private lastLocationSentAt = 0;

  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);
  private readonly profileService = inject(ProfileService);

  protected readonly profile = this.profileService.profile;
  protected readonly isHistory = computed(() => this.route.snapshot.url[0]?.path === 'history');
  
  protected readonly filteredOrders = computed(() => {
    const orders = this.myOrders();
    const isHist = this.isHistory();
    return orders.filter((o: OrderSummary) => {
      const active = !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status.toUpperCase());
      return isHist ? !active : active;
    });
  });

  constructor() {
    void this.boot();
  }

  ngOnDestroy(): void {
    this.stopGpsTracking();
  }

  private async boot() {
    await Promise.all([
      this.loadAvailable(),
      this.loadMyOrders(),
      this.loadDriverStats()
    ]);
  }

  protected async loadAvailable() {
    if (this.isHistory()) return;
    this.loadingAvailable = true;
    try {
      const data = await this.apiService.getAvailableDeliveries();
      this.available.set(data);
    } catch (e) {
      this.errorMessage = 'Error al cargar pedidos disponibles.';
    } finally {
      this.loadingAvailable = false;
    }
  }

  protected async loadMyOrders() {
    this.loadingMyOrders = true;
    try {
      const data = await this.apiService.getMyOrders();
      this.myOrders.set(data);
    } catch (e) {
      this.errorMessage = 'Error al cargar tus entregas.';
    } finally {
      this.loadingMyOrders = false;
    }
  }

  protected async loadDriverStats() {
    try {
      const stats = await this.apiService.getDriverStats();
      this.driverStats.set(stats);
    } catch (e) {
      console.warn('Error loading driver stats', e);
    }
  }

  protected async toggleItems(orderId: number) {
    if (this.expandedOrderId() === orderId) {
      this.expandedOrderId.set(null);
      return;
    }

    this.expandedOrderId.set(orderId);
    if (!this.itemsMap()[orderId]) {
      try {
        const items = await this.apiService.getOrderItems(orderId);
        this.itemsMap.update((m: Record<number, any[]>) => ({ ...m, [orderId]: items }));
      } catch (e) {
        console.warn('Error loading items', e);
      }
    }
  }

  protected async acceptDelivery(orderId: number) {
    this.takingOrderId = orderId;
    this.errorMessage = '';
    try {
      await this.apiService.acceptDelivery(orderId);
      this.message = 'Pedido aceptado correctamente.';
      await this.boot();
    } catch (e) {
      this.errorMessage = 'No se pudo aceptar el pedido.';
    } finally {
      this.takingOrderId = null;
    }
  }

  protected async updateDeliveryStatus(orderId: number, status: 'IN_TRANSIT' | 'DELIVERED') {
    this.updatingOrderId = orderId;
    this.errorMessage = '';
    try {
      await this.apiService.updateDeliveryStatus(orderId, status);
      if (status === 'IN_TRANSIT') {
        this.startGpsTracking(orderId);
      } else {
        this.stopGpsTracking();
      }
      this.message = status === 'DELIVERED' ? '¡Pedido entregado!' : 'Iniciando ruta...';
      await this.loadMyOrders();
    } catch (e) {
      this.errorMessage = 'Error al actualizar el estado.';
    } finally {
      this.updatingOrderId = null;
    }
  }

  protected async onFileSelected(event: any, orderId: number) {
    const file = event.target.files[0];
    if (!file) return;
    this.message = `Imagen "${file.name}" cargada localmente (Preparado para S3)`;
    setTimeout(() => this.message = '', 3000);
  }

  private startGpsTracking(orderId: number) {
    if (!this.gpsSupported) return;
    this.stopGpsTracking();
    this.trackingOrderId = orderId;
    this.gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => this.handleGpsUpdate(pos),
      (err) => this.handleGpsError(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  private stopGpsTracking() {
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
    this.trackingOrderId = null;
    this.lastGpsUpdate = null;
  }

  private async handleGpsUpdate(pos: GeolocationPosition) {
    this.lastGpsUpdate = { accuracy: Math.round(pos.coords.accuracy), at: new Date().toLocaleTimeString() };
    const now = Date.now();
    if (now - this.lastLocationSentAt < 10000) return;
    if (!this.trackingOrderId) return;
    try {
      await this.apiService.updateDeliveryLocation(this.trackingOrderId, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
      this.lastLocationSentAt = now;
    } catch (e) {
      console.warn('Error sending location', e);
    }
  }

  private handleGpsError(err: GeolocationPositionError) {
    console.error('GPS Error', err);
    this.stopGpsTracking();
    this.errorMessage = 'Error de GPS: ' + err.message;
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      READY_FOR_PICKUP: 'Listo para recoger',
      ASSIGNED: 'Por recoger',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
    };
    return map[status.toUpperCase()] ?? status;
  }

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      READY_FOR_PICKUP: 'ready',
      ASSIGNED: 'assigned',
      IN_TRANSIT: 'in-transit',
      DELIVERED: 'delivered',
    };
    return map[status.toUpperCase()] ?? 'default';
  }

  protected canStartTransit(status: string): boolean { return status === 'READY_FOR_PICKUP' || status === 'ACCEPTED' || status === 'ASSIGNED'; }
  protected canDeliver(status: string): boolean { return status === 'IN_TRANSIT'; }
}
