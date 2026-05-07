import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import type { OrderLocationEvent, OrderStatusEvent, OrderSummary } from '../core/models';
import { OrderEventsService } from '../core/order-events.service';
import { OrderMapComponent } from '../components/order-map.component';

const STEPS = [
  { key: 'PENDING',          label: 'Recibido', icon: '📥' },
  { key: 'ACCEPTED',         label: 'Preparando', icon: '👨‍🍳' },
  { key: 'READY_FOR_PICKUP', label: 'Listo', icon: '🥡' },
  { key: 'ASSIGNED',         label: 'Asignado', icon: '🛵' },
  { key: 'IN_TRANSIT',       label: 'En camino', icon: '🚩' },
  { key: 'DELIVERED',        label: 'Entregado', icon: '✅' },
] as const;

const STATUS_INDEX: Record<string, number> = {
  PENDING: 0, ACCEPTED: 1, READY_FOR_PICKUP: 2,
  ASSIGNED: 3, IN_TRANSIT: 4, DELIVERED: 5,
};

@Component({
  selector: 'app-client-orders-page',
  standalone: true,
  imports: [CommonModule, OrderMapComponent],
  template: `
    <div class="orders-page anim-fade-in">
      <header class="page-header">
        <div class="header-text">
          <h1>Mis Pedidos</h1>
          <p>Sigue el estado de tus entregas en tiempo real</p>
        </div>
        <button class="refresh-btn" (click)="loadOrders()" [disabled]="loadingOrders()">
          <svg viewBox="0 0 24 24" [class.spinning]="loadingOrders()"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8M21 3v5h-5"/></svg>
          Actualizar
        </button>
      </header>

      @if (loadingOrders() && !orders().length) {
        <div class="loading-state">
          <span class="loader"></span>
          <p>Cargando tu historial...</p>
        </div>
      } @else if (!orders().length) {
        <div class="empty-state">
          <div class="empty-icon">🛍️</div>
          <h2>¿Aún no has pedido nada?</h2>
          <p>Tus platillos favoritos están a solo unos clics de distancia.</p>
          <button class="primary-btn" routerLink="/">Explorar restaurantes</button>
        </div>
      } @else {
        <div class="orders-grid">
          @for (order of orders(); track order.id) {
            <div class="order-card" [class.order-card--active]="isActive(order.status)">
              <div class="order-card__header">
                <div class="order-info">
                  <span class="order-id">Pedido #{{ order.id }}</span>
                  <span class="restaurant-name">{{ order.restaurant_name }}</span>
                  <span class="order-date">{{ order.created_at | date:'medium' }}</span>
                </div>
                <div class="order-status-badge" [class]="'status--' + order.status.toLowerCase()">
                  {{ statusLabel(order.status) }}
                </div>
              </div>

              @if (order.driver_name && isActive(order.status)) {
                <div class="driver-info-bar anim-slide-down">
                  <span class="driver-avatar">🛵</span>
                  <div class="driver-meta">
                    <small>Tu repartidor</small>
                    <strong>{{ order.driver_name }}</strong>
                  </div>
                </div>
              }

              <!-- TRACKING STEPPER (Only for active orders) -->
              @if (isActive(order.status)) {
                <div class="stepper">
                  @for (step of steps; track step.key; let i = $index) {
                    <div class="step" 
                      [class.step--done]="stepIndex(order.status) > i" 
                      [class.step--active]="stepIndex(order.status) === i">
                      <div class="step__dot">
                        @if (stepIndex(order.status) > i) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>
                        } @else {
                          <span class="step__icon">{{ step.icon }}</span>
                        }
                      </div>
                      <span class="step__label">{{ step.label }}</span>
                    </div>
                    @if (i < steps.length - 1) {
                      <div class="step__line" [class.step__line--done]="stepIndex(order.status) > i"></div>
                    }
                  }
                </div>
              } @else {
                <div class="failed-msg" [class.cancelled]="order.status === 'CANCELLED'" [class.delivered]="order.status === 'DELIVERED'">
                  @if (order.status === 'DELIVERED') {
                    ¡Pedido Entregado! Gracias por tu compra.
                  } @else if (order.status === 'CANCELLED') {
                    Pedido Cancelado
                  } @else {
                    Pedido Rechazado por el negocio
                  }
                </div>
              }

              <!-- MAP SECTION -->
              @if (hasDriverLocation(order) && isActive(order.status)) {
                <div class="map-section anim-slide-up">
                  <div class="map-header">
                    <span class="live-pulse"></span>
                    <strong>Repartidor en movimiento</strong>
                    <span class="update-time">Actualizado {{ locationAge(order.location_updated_at) }}</span>
                  </div>
                  <div class="map-container">
                    <app-order-map [lat]="order.driver_latitude!" [lng]="order.driver_longitude!"></app-order-map>
                  </div>
                </div>
              } @else if (order.status === 'IN_TRANSIT') {
                <div class="map-placeholder">
                  <span class="loader loader--sm"></span>
                  Conectando con el GPS del repartidor...
                </div>
              }

              <!-- ITEMS SECTION -->
              <div class="items-section">
                <button class="items-toggle" (click)="toggleItems(order.id)">
                  {{ expandedOrders().includes(order.id) ? 'Ocultar productos' : 'Ver productos' }}
                  <span class="chevron" [class.expanded]="expandedOrders().includes(order.id)">▾</span>
                </button>

                @if (expandedOrders().includes(order.id)) {
                  <div class="items-list anim-slide-down">
                    @if (!itemsMap()[order.id]) {
                      <div class="items-loader"><span class="loader loader--sm"></span></div>
                    } @else {
                      @for (item of itemsMap()[order.id]; track item.id) {
                        <div class="item-row">
                          <span class="item-qty">{{ item.quantity }}x</span>
                          <span class="item-name">{{ item.product_name }}</span>
                          <span class="item-price">\${{ item.line_total }}</span>
                        </div>
                      }
                    }
                  </div>
                }
              </div>

              <div class="order-card__footer">
                <div class="total-group">
                  <span>Total pagado</span>
                  <strong>\${{ order.total }}</strong>
                </div>
                @if (canCancel(order.status)) {
                  <button class="cancel-btn" (click)="cancelOrder(order.id)" [disabled]="cancellingOrderId() === order.id">
                    @if (cancellingOrderId() === order.id) { <span class="loader loader--sm"></span> }
                    @else { Cancelar Pedido }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .orders-page { max-width: 1000px; margin: 0 auto; padding-bottom: 4rem; }
    
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
    .header-text h1 { margin: 0; font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em; }
    .header-text p { margin: 0.4rem 0 0; color: var(--muted); font-size: 1.1rem; }

    .refresh-btn { display: flex; align-items: center; gap: 0.6rem; background: white; border: 1.5px solid var(--line); padding: 0.7rem 1.2rem; border-radius: 99px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .refresh-btn svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .refresh-btn:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); }
    .spinning { animation: spin 1s linear infinite; }

    .loading-state { text-align: center; padding: 4rem; display: grid; place-items: center; gap: 1rem; }
    .empty-state { text-align: center; padding: 5rem 2rem; background: white; border-radius: 32px; border: 1.5px solid var(--line); box-shadow: 0 10px 30px rgba(0,0,0,0.03); }
    .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    .primary-btn { background: var(--primary); color: white; border: none; padding: 1rem 2rem; border-radius: 99px; font-weight: 700; cursor: pointer; margin-top: 1.5rem; }

    .orders-grid { display: grid; gap: 2rem; }
    .order-card { background: white; border-radius: 28px; border: 1.5px solid var(--line); padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .order-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.05); border-color: var(--primary-soft); }
    .order-card--active { border-color: var(--primary); box-shadow: 0 12px 40px rgba(255,68,31,0.08); }

    .order-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .order-info { display: grid; gap: 2px; }
    .order-id { font-size: 1.2rem; font-weight: 900; color: var(--ink); }
    .restaurant-name { font-weight: 800; color: var(--primary); font-size: 0.95rem; }
    .order-date { font-size: 0.75rem; color: var(--muted); font-weight: 600; }

    .driver-info-bar { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; background: #f0fdf4; border-radius: 20px; margin-bottom: 2rem; border: 1.5px solid #bbf7d0; }
    .driver-avatar { font-size: 1.5rem; }
    .driver-meta { display: grid; gap: 1px; }
    .driver-meta small { font-size: 0.65rem; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em; }
    .driver-meta strong { font-size: 0.95rem; font-weight: 700; color: #166534; }

    .order-status-badge { padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .status--pending { background: #fff7ed; color: #c2410c; }
    .status--accepted { background: #f0fdf4; color: #15803d; }
    .status--in_transit { background: #eff6ff; color: #1d4ed8; }
    .status--delivered { background: var(--bg-app); color: var(--muted); }
    .status--cancelled { background: #fef2f2; color: #b91c1c; }

    /* ── STEPPER ── */
    .stepper { display: flex; align-items: flex-start; justify-content: space-between; padding: 1rem 0; margin-bottom: 2rem; position: relative; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; z-index: 2; position: relative; flex: 1; }
    .step__dot { width: 40px; height: 40px; border-radius: 50%; background: white; border: 2px solid var(--line); display: grid; place-items: center; transition: all 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .step__icon { font-size: 1.2rem; filter: grayscale(1); opacity: 0.5; }
    .step__label { font-size: 0.7rem; font-weight: 700; color: var(--muted); text-align: center; max-width: 60px; line-height: 1.3; }

    .step--done .step__dot { background: #22c55e; border-color: #22c55e; color: white; }
    .step--done .step__label { color: #22c55e; }
    .step--active .step__dot { background: var(--primary); border-color: var(--primary); color: white; transform: scale(1.15); box-shadow: 0 0 0 5px var(--primary-soft); }
    .step--active .step__icon { filter: none; opacity: 1; }
    .step--active .step__label { color: var(--primary); font-weight: 800; font-size: 0.75rem; }

    .step__line { position: absolute; top: 31px; height: 3px; background: var(--line); width: calc(100% / 6); z-index: 1; transition: all 0.3s; }
    /* Position lines correctly based on index */
    .step__line:nth-child(2) { left: 8.3%; }
    .step__line:nth-child(4) { left: 25%; }
    .step__line:nth-child(6) { left: 41.6%; }
    .step__line:nth-child(8) { left: 58.3%; }
    .step__line:nth-child(10) { left: 75%; }
    .step__line--done { background: #22c55e; }

    .failed-msg { padding: 1.5rem; background: #fef2f2; border-radius: 16px; border: 1.5px solid #fee2e2; color: #b91c1c; font-weight: 700; text-align: center; margin-bottom: 2rem; }
    .failed-msg.cancelled { background: var(--bg-app); border-color: var(--line); color: var(--muted); }
    .failed-msg.delivered { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }

    /* ── MAP SECTION ── */
    .map-section { background: var(--bg-app); border-radius: 24px; overflow: hidden; border: 1.5px solid var(--line); margin-bottom: 2rem; }
    .map-header { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.5rem; font-size: 0.9rem; }
    .live-pulse { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
    .update-time { margin-left: auto; color: var(--muted); font-size: 0.8rem; font-weight: 500; }
    .map-container { height: 250px; }

    .map-placeholder { padding: 3rem; background: #eff6ff; border: 2px dashed #bfdbfe; border-radius: 24px; color: #1e40af; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 2rem; }

    /* ── ITEMS SECTION ── */
    .items-section { border-top: 1.5px solid var(--line); border-bottom: 1.5px solid var(--line); margin: 0 -2rem; padding: 0.5rem 2rem; background: var(--bg-app); }
    .items-toggle { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; background: none; border: 0; font-weight: 700; color: var(--muted); cursor: pointer; font-size: 0.9rem; }
    .items-toggle:hover { color: var(--ink); }
    .chevron { font-size: 1.2rem; transition: transform 0.2s; color: var(--line-strong); }
    .chevron.expanded { transform: rotate(180deg); }
    
    .items-list { padding: 0.5rem 0 1.5rem; display: grid; gap: 0.75rem; }
    .items-loader { padding: 1rem; text-align: center; }
    .item-row { display: flex; align-items: center; gap: 1rem; font-size: 0.95rem; }
    .item-qty { font-weight: 800; color: var(--primary); background: var(--primary-soft); padding: 0.1rem 0.5rem; border-radius: 6px; font-size: 0.75rem; }
    .item-name { flex: 1; font-weight: 600; color: var(--ink); }
    .item-price { font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }

    .order-card__footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1.5px solid var(--line); }
    .total-group { display: grid; gap: 2px; }
    .total-group span { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
    .total-group strong { font-size: 1.4rem; font-weight: 900; color: var(--ink); }
    
    .cancel-btn { background: #fef2f2; color: #b91c1c; border: none; padding: 0.8rem 1.5rem; border-radius: 99px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
    .cancel-btn:hover:not(:disabled) { background: #fee2e2; transform: scale(1.05); }

    .loader { width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .loader--sm { width: 18px; height: 18px; border-width: 2.5px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .anim-fade-in { animation: fadeIn 0.4s ease-out; }
    .anim-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `
})
export class ClientOrdersPageComponent implements OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly orderEventsService = inject(OrderEventsService);

  protected readonly steps = STEPS;
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly loadingOrders = signal(false);
  protected readonly cancellingOrderId = signal<number | null>(null);
  protected readonly expandedOrders = signal<number[]>([]);
  protected readonly itemsMap = signal<Record<number, any[]>>({});

  private eventSource: EventSource | null = null;

  constructor() {
    void this.boot();
  }

  async toggleItems(orderId: number) {
    if (this.expandedOrders().includes(orderId)) {
      this.expandedOrders.update(ids => ids.filter(id => id !== orderId));
    } else {
      this.expandedOrders.update(ids => [...ids, orderId]);
      if (!this.itemsMap()[orderId]) {
        try {
          const items = await this.apiService.getOrderItems(orderId);
          this.itemsMap.update(map => ({ ...map, [orderId]: items }));
        } catch (e) {
          console.error('Error loading items', e);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  protected stepIndex(status: string): number {
    return STATUS_INDEX[status] ?? -1;
  }

  protected isFailed(status: string): boolean {
    const s = status.toUpperCase();
    return s === 'CANCELLED' || s === 'REJECTED';
  }

  protected isActive(status: string): boolean {
    const s = status.toUpperCase();
    return !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(s);
  }

  protected statusLabel(status: string): string {
    const s = status.toUpperCase();
    const map: Record<string, string> = {
      PENDING: 'Recibido', ACCEPTED: 'Preparando', READY_FOR_PICKUP: '¡Listo!',
      ASSIGNED: 'Repartidor asignado', IN_TRANSIT: 'En camino', DELIVERED: 'Entregado',
      REJECTED: 'Rechazado', CANCELLED: 'Cancelado',
    };
    return map[s] ?? status;
  }

  protected canCancel(status: string): boolean {
    return ['PENDING', 'ACCEPTED'].includes(status);
  }

  protected hasDriverLocation(order: OrderSummary): boolean {
    return typeof order.driver_latitude === 'number' && typeof order.driver_longitude === 'number';
  }

  protected locationAge(value: string | null): string {
    if (!value) return 'hace poco';
    const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `hace ${seconds}s`;
    const minutes = Math.round(seconds / 60);
    return `hace ${minutes} min`;
  }

  protected async loadOrders(): Promise<void> {
    this.loadingOrders.set(true);
    try {
      const data = await this.apiService.getMyOrders();
      this.orders.set(data);
    } catch (error) {
      console.error('Error loading orders', error);
    } finally {
      this.loadingOrders.set(false);
    }
  }

  protected async cancelOrder(orderId: number): Promise<void> {
    this.cancellingOrderId.set(orderId);
    try {
      await this.apiService.cancelOrder(orderId);
      await this.loadOrders();
    } catch (error) {
      console.error('Error cancelling order', error);
    } finally {
      this.cancellingOrderId.set(null);
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
        this.orders.update(current => {
          const found = current.find(o => o.id === event.orderId);
          if (found) found.status = event.status;
          return [...current];
        });
      },
      onOrderLocationChanged: (event: OrderLocationEvent) => {
        this.orders.update(current => {
          const found = current.find(o => o.id === event.orderId);
          if (found) {
            found.driver_latitude = event.latitude;
            found.driver_longitude = event.longitude;
            found.driver_accuracy = event.accuracy;
            found.location_updated_at = event.at;
          }
          return [...current];
        });
      }
    });
  }
}
