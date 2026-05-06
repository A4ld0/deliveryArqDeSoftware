import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';

@Component({
  selector: 'app-client-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="card">
      <div class="card-header">
        <div class="card-header__left">
          <span class="step-badge">02</span>
          <h3>Checkout</h3>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="goToShop()">
          ← Volver al menú
        </button>
      </div>

      @if (!selectedRestaurantId()) {
        <div class="empty-state">
          <span class="empty-state__icon">🏪</span>
          <p>Primero selecciona un restaurante y agrega productos al carrito.</p>
        </div>
      } @else if (!cart().length) {
        <div class="empty-state">
          <span class="empty-state__icon">🛒</span>
          <p>Tu carrito está vacío. Agrega productos para continuar.</p>
        </div>
      } @else {

        <div class="restaurant-badge">
          <span class="restaurant-badge__icon">🍽️</span>
          <span>{{ selectedRestaurantName() || 'Restaurante seleccionado' }}</span>
        </div>

        <div class="cart-section">
          <h4 class="section-label">Productos en tu pedido</h4>
          <ul class="cart-list">
            @for (line of cart(); track line.productId) {
              <li class="cart-item">
                <div class="cart-item__info">
                  <strong>{{ line.name }}</strong>
                  <span class="cart-item__unit">\${{ line.price.toFixed(2) }} c/u</span>
                </div>
                <div class="cart-item__controls">
                  <button type="button" class="qty-btn" (click)="changeQty(line.productId, -1)">−</button>
                  <span class="qty-value">{{ line.quantity }}</span>
                  <button type="button" class="qty-btn" (click)="changeQty(line.productId, 1)">+</button>
                  <span class="cart-item__subtotal">\${{ (line.price * line.quantity).toFixed(2) }}</span>
                  <button type="button" class="btn-remove" (click)="removeFromCart(line.productId)" title="Quitar">✕</button>
                </div>
              </li>
            }
          </ul>

          <div class="total-row">
            <span>Subtotal</span>
            <strong class="total-amount">\${{ cartSubtotal().toFixed(2) }}</strong>
          </div>
        </div>

        <div class="checkout-form-section">
          <h4 class="section-label">Datos de entrega y pago</h4>
          <form class="form" (submit)="checkout($event)">
            <label>
              <span class="label-text">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="14" height="14"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                Dirección de entrega
              </span>
              <input
                type="text"
                name="deliveryAddress"
                [(ngModel)]="deliveryAddress"
                required
                minlength="6"
                placeholder="Ej. Calle Juárez 123, Col. Centro"
              />
            </label>

            <label>
              <span class="label-text">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
                Método de pago (simulado)
              </span>
              <select name="paymentMethod" [(ngModel)]="paymentMethod">
                <option value="SIMULATED_CARD">💳 Tarjeta simulada</option>
                <option value="SIMULATED_CASH">💵 Efectivo simulado</option>
              </select>
            </label>

            <div class="form-actions">
              <button type="submit" class="btn btn--primary btn--lg" [disabled]="placingOrder">
                @if (placingOrder) {
                  <span class="spinner"></span>
                  Procesando...
                } @else {
                  ✓ Confirmar pedido
                }
              </button>
              <button type="button" class="btn btn--ghost" (click)="clearCart()">
                Vaciar carrito
              </button>
            </div>
          </form>
        </div>
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
      gap: var(--space-5);
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
    h4 { margin: 0; }

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

    .btn--primary {
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      box-shadow: 0 3px 10px rgba(248, 92, 35, 0.22);
    }

    .btn--primary:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(248, 92, 35, 0.3);
    }

    .btn--ghost {
      background: var(--surface-alt);
      border: 1px solid var(--line);
      color: var(--ink);
    }

    .btn--ghost:hover:not([disabled]) {
      border-color: var(--line-strong);
    }

    .btn--sm { padding: 0.38rem 0.8rem; font-size: 0.82rem; }
    .btn--lg { min-height: 48px; font-size: 0.95rem; padding: 0.65rem 1.4rem; border-radius: var(--radius-sm); }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) 0;
      text-align: center;
    }

    .empty-state__icon { font-size: 2.5rem; line-height: 1; }
    .empty-state p { margin: 0; color: var(--muted); font-size: 0.92rem; }

    /* ── Restaurant badge ── */
    .restaurant-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--surface-alt);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.38rem 0.85rem;
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--ink);
      width: fit-content;
    }

    .restaurant-badge__icon { font-size: 1rem; }

    /* ── Cart section ── */
    .cart-section {
      display: grid;
      gap: var(--space-3);
    }

    .section-label {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--line);
    }

    .cart-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-2);
    }

    .cart-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
      padding: var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface-alt);
    }

    .cart-item__info {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }

    .cart-item__info strong { font-size: 0.92rem; font-weight: 700; color: var(--ink); }
    .cart-item__unit { font-size: 0.8rem; color: var(--muted); }

    .cart-item__controls {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .qty-btn {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      border: 1px solid var(--line-strong);
      background: var(--panel);
      color: var(--ink);
      font-size: 1rem;
      font-weight: 700;
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: auto;
    }

    .qty-btn:hover { background: var(--primary-soft); border-color: var(--primary-muted); }

    .qty-value { font-weight: 700; font-size: 0.95rem; min-width: 1.4rem; text-align: center; }
    .cart-item__subtotal { font-weight: 700; color: var(--primary-strong); font-size: 0.9rem; min-width: 3rem; text-align: right; }

    .btn-remove {
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 50%;
      border: 0;
      background: var(--danger-soft);
      color: var(--danger);
      font-size: 0.65rem;
      font-weight: 700;
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: auto;
    }

    .btn-remove:hover { background: var(--danger); color: #fff; }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--primary-soft);
      border: 1px solid var(--primary-muted);
    }

    .total-row span { font-size: 0.9rem; font-weight: 600; color: var(--primary-strong); }
    .total-amount { font-size: 1.2rem; font-weight: 800; color: var(--ink); }

    /* ── Checkout form ── */
    .checkout-form-section { display: grid; gap: var(--space-4); }

    .form { display: grid; gap: var(--space-4); }

    label { display: grid; gap: 0.42rem; }

    .label-text {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    input, select {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      font: inherit;
      font-size: 0.92rem;
      background: var(--surface);
      color: var(--ink);
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 44px;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.12);
    }

    .form-actions {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }

    /* ── Spinner ── */
    .spinner {
      width: 0.9rem;
      height: 0.9rem;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

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
export class ClientCheckoutPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly orderState = inject(ClientOrderStateService);
  private readonly router = inject(Router);

  protected readonly cart = this.orderState.cart;
  protected readonly selectedRestaurantId = this.orderState.selectedRestaurantId;
  protected readonly selectedRestaurantName = this.orderState.selectedRestaurantName;
  protected readonly cartSubtotal = this.orderState.cartSubtotal;

  protected deliveryAddress = '';
  protected paymentMethod = 'SIMULATED_CARD';
  protected placingOrder = false;

  protected message = '';
  protected errorMessage = '';

  protected async goToShop(): Promise<void> {
    await this.router.navigateByUrl('/client/shop');
  }

  protected changeQty(productId: number, delta: number): void {
    this.orderState.changeQty(productId, delta);
  }

  protected removeFromCart(productId: number): void {
    this.orderState.removeProduct(productId);
  }

  protected clearCart(): void {
    this.orderState.clearCart();
  }

  protected async checkout(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';

    const restaurantId = this.selectedRestaurantId();
    if (!restaurantId) {
      this.errorMessage = 'Primero selecciona un restaurante.';
      return;
    }
    if (!this.cart().length) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    this.placingOrder = true;
    try {
      const order = await this.apiService.createOrder({
        restaurantId,
        deliveryAddress: this.deliveryAddress.trim(),
        paymentMethod: this.paymentMethod,
        items: this.cart().map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        }))
      });

      this.orderState.clearCart();
      this.deliveryAddress = '';
      this.message = `Pedido #${order.id} creado correctamente.`;
      await this.router.navigateByUrl('/client/orders');
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear el pedido.');
    } finally {
      this.placingOrder = false;
    }
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