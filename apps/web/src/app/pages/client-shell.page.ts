import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import { SessionService } from '../core/session.service';
import type { OrderSummary } from '../core/models';

@Component({
  selector: 'app-client-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="app-shell">
      <div class="app-content">
        @if (activeOrder(); as order) {
          <div
            class="active-order-banner anim-slide-down"
            role="status"
            aria-live="polite"
            [attr.aria-label]="'Pedido activo ' + order.id + ', estado ' + statusLabel(order.status)"
          >
            <div class="order-info">
              <span class="status-dot pulsing"></span>
              <div class="text-group">
                <strong>Pedido #{{ order.id }} - {{ statusLabel(order.status) }}</strong>
                <span>Tu pedido está en camino. {{ order.restaurant_name || 'Procesando...' }}</span>
              </div>
            </div>
            <a routerLink="/orders" class="track-btn">Seguir pedido</a>
          </div>
        }
        <router-outlet />
      </div>
    </div>
  `,
  styles: `
    .app-shell {
      min-height: 100vh;
      background: var(--bg-app);
    }

    .app-content {
      padding: 0;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    /* ── ACTIVE ORDER BANNER ── */
    .active-order-banner {
      background: var(--ink);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    .order-info { display: flex; align-items: center; gap: 1rem; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--primary); }
    .status-dot.pulsing { animation: pulse-status 1.5s infinite; }
    @keyframes pulse-status { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }

    .text-group { display: flex; flex-direction: column; gap: 2px; }
    .text-group strong { font-size: 0.95rem; }
    .text-group span { font-size: 0.8rem; opacity: 0.7; }

    .track-btn {
      background: white; color: var(--ink); text-decoration: none; padding: 6px 14px; border-radius: 99px; font-weight: 700; font-size: 0.82rem; transition: transform 0.2s;
    }
    .track-btn:hover { transform: scale(1.05); }

    .anim-slide-down { animation: slideDown 0.4s ease-out; }
    @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `
})
export class ClientShellPageComponent {
  private readonly orderState = inject(ClientOrderStateService);
  private readonly sessionService = inject(SessionService);
  private readonly apiService = inject(ApiService);
  
  protected readonly cartItemsCount = this.orderState.cartItemsCount;
  protected readonly isAuthenticated = this.sessionService.isAuthenticated;
  protected readonly activeOrder = signal<OrderSummary | null>(null);

  constructor() {
    this.checkActiveOrders();
    // Re-check periodically or on specific events if needed
    setInterval(() => this.checkActiveOrders(), 30000);
  }

  private async checkActiveOrders() {
    if (!this.isAuthenticated()) return;
    try {
      const orders = await this.apiService.getMyOrders();
      const active = orders.find(o => ['PENDING', 'ACCEPTED', 'IN_TRANSIT'].includes(o.status));
      this.activeOrder.set(active || null);
    } catch (e) {
      console.error('Error checking active orders', e);
    }
  }

  protected statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptado',
      READY_FOR_PICKUP: 'Listo para recoger',
      ASSIGNED: 'Asignado',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      REJECTED: 'Rechazado'
    };

    return labels[status] ?? status;
  }
}
