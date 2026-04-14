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
      <div class="card-title">
        <h3>Paso 3: Checkout</h3>
        <button type="button" class="ghost" (click)="goToShop()">Volver a comprar</button>
      </div>

      @if (!selectedRestaurantId()) {
        <p class="muted">Primero selecciona un restaurante y agrega productos.</p>
      } @else if (!cart().length) {
        <p class="muted">Tu carrito esta vacio. Agrega productos para continuar.</p>
      } @else {
        <p class="muted">{{ selectedRestaurantName() || 'Restaurante seleccionado' }}</p>

        <ul class="list">
          @for (line of cart(); track line.productId) {
            <li>
              <div class="row">
                <strong>{{ line.name }}</strong>
                <span>\${{ line.price.toFixed(2) }}</span>
              </div>
              <div class="qty">
                <button type="button" class="ghost" (click)="changeQty(line.productId, -1)">-</button>
                <span>{{ line.quantity }}</span>
                <button type="button" class="ghost" (click)="changeQty(line.productId, 1)">+</button>
                <button type="button" class="danger" (click)="removeFromCart(line.productId)">Quitar</button>
              </div>
            </li>
          }
        </ul>

        <p class="total">Subtotal: <strong>\${{ cartSubtotal().toFixed(2) }}</strong></p>

        <form class="form" (submit)="checkout($event)">
          <label>
            Direccion de entrega
            <input
              type="text"
              name="deliveryAddress"
              [(ngModel)]="deliveryAddress"
              required
              minlength="6"
            />
          </label>

          <label>
            Metodo de pago (simulado)
            <select name="paymentMethod" [(ngModel)]="paymentMethod">
              <option value="SIMULATED_CARD">Tarjeta simulada</option>
              <option value="SIMULATED_CASH">Efectivo simulado</option>
            </select>
          </label>

          <div class="actions">
            <button type="submit" [disabled]="placingOrder">
              {{ placingOrder ? 'Procesando...' : 'Confirmar pedido' }}
            </button>
            <button type="button" class="ghost" (click)="clearCart()">Vaciar carrito</button>
          </div>
        </form>
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
      justify-content: space-between;
      align-items: center;
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
    .qty { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .total { margin-top: var(--space-4); font-size: 1rem; }
    .form { display: grid; gap: var(--space-3); margin-top: var(--space-4); }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; }
    input, select {
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      padding: 0.62rem 0.72rem;
      font: inherit;
      background: var(--surface);
    }
    .actions { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-1); }
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
    .danger { background: var(--danger); font-weight: 700; }
    .muted { color: var(--muted); margin-top: var(--space-2); }
    .message { color: var(--primary); font-weight: 700; margin-top: var(--space-4); }
    .error { color: var(--danger); font-weight: 700; margin-top: var(--space-4); }
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
      this.errorMessage = 'Tu carrito esta vacio.';
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
