import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import { ProfileService } from '../core/profile.service';

const DELIVERY_FEE = 25;

@Component({
  selector: 'app-client-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="checkout-container">
      <header class="checkout-header">
        <a routerLink="/" class="back-btn" aria-label="Volver a la tienda">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
        </a>
        <h1>Finalizar pedido</h1>
      </header>

      @if (!selectedRestaurantId() || !cart().length) {
        <div class="empty-checkout anim-fade-in">
          <div class="empty-icon">🛍️</div>
          <h2>Tu carrito está vacío</h2>
          <p>Parece que aún no has agregado nada de <strong>{{ selectedRestaurantName() || 'ningún restaurante' }}</strong>.</p>
          <button class="primary-btn" routerLink="/">Volver a la tienda</button>
        </div>
      } @else {
        <div class="checkout-grid anim-slide-up">
          
          <!-- LEFT: FORM & ITEMS -->
          <div class="checkout-main">
            <section class="checkout-section">
              <div class="section-header">
                <span class="step-num">1</span>
                <h3>Detalles de entrega</h3>
              </div>
              <div class="delivery-card">
                <div class="input-group">
                  <label for="checkout-delivery-address">Dirección completa</label>
                  <div class="input-wrapper">
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" class="input-icon"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                    <input id="checkout-delivery-address" name="deliveryAddress" type="text" [(ngModel)]="deliveryAddress" placeholder="Ej. Av. Vallarta 123, Int 4" required autocomplete="street-address" />
                  </div>
                </div>
              </div>
            </section>

            <section class="checkout-section">
              <div class="section-header">
                <span class="step-num">2</span>
                <h3>Método de pago</h3>
              </div>
              <div class="payment-options" role="group" aria-label="Metodo de pago simulado">
                <button type="button" class="pay-option" [class.active]="paymentMethod === 'SIMULATED_CARD'" [attr.aria-pressed]="paymentMethod === 'SIMULATED_CARD'" (click)="paymentMethod = 'SIMULATED_CARD'">
                  <div class="pay-option__icon" aria-hidden="true">💳</div>
                  <div class="pay-option__text">
                    <strong>Tarjeta de Crédito/Débito</strong>
                    <span>Pago seguro instantáneo</span>
                  </div>
                  <div class="radio-circle"></div>
                </button>
                <button type="button" class="pay-option" [class.active]="paymentMethod === 'SIMULATED_CASH'" [attr.aria-pressed]="paymentMethod === 'SIMULATED_CASH'" (click)="paymentMethod = 'SIMULATED_CASH'">
                  <div class="pay-option__icon" aria-hidden="true">💵</div>
                  <div class="pay-option__text">
                    <strong>Efectivo al recibir</strong>
                    <span>Paga en el domicilio</span>
                  </div>
                  <div class="radio-circle"></div>
                </button>
              </div>
            </section>

            <section class="checkout-section">
              <div class="section-header">
                <span class="step-num">3</span>
                <h3>Resumen de productos</h3>
              </div>
              <div class="items-list">
                @for (item of cart(); track item.productId) {
                  <div class="item-row">
                    <div class="item-qty">{{ item.quantity }}x</div>
                    <div class="item-name">{{ item.name }}</div>
                    <div class="item-price">\${{ (item.price * item.quantity).toFixed(2) }}</div>
                  </div>
                }
              </div>
            </section>
          </div>

          <!-- RIGHT: SUMMARY & PAY -->
          <aside class="checkout-summary" aria-label="Resumen de pago">
            <div class="summary-card">
              <h3>Resumen de pago</h3>
              <div class="summary-rows">
                <div class="summary-row">
                  <span>Productos</span>
                  <span>\${{ cartSubtotal().toFixed(2) }}</span>
                </div>
                <div class="summary-row">
                  <span>Costo de envío</span>
                  <span>\${{ deliveryFee.toFixed(2) }}</span>
                </div>
                <div class="summary-row total">
                  <span>Total a pagar</span>
                  <strong>\${{ (cartSubtotal() + deliveryFee).toFixed(2) }}</strong>
                </div>
              </div>

              @if (errorMessage) {
                <div class="error-msg anim-shake" role="alert">{{ errorMessage }}</div>
              }

              <button type="button" class="confirm-btn" [disabled]="placingOrder || !deliveryAddress" [attr.aria-busy]="placingOrder" (click)="confirmOrder()">
                @if (placingOrder) {
                  <span class="loader"></span>
                } @else {
                  Confirmar y Pagar
                }
              </button>
              <p class="terms">Al confirmar, aceptas nuestros términos y condiciones de servicio.</p>
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .checkout-container { max-width: 1200px; margin: 0 auto; padding-bottom: 5rem; }
    
    .checkout-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; }
    .checkout-header h1 { margin: 0; font-size: 2rem; font-weight: 850; letter-spacing: -0.02em; }
    .back-btn { width: 44px; height: 44px; border-radius: 50%; background: white; border: 1.5px solid var(--line); display: grid; place-items: center; cursor: pointer; color: var(--ink); transition: all 0.2s; }
    .back-btn:hover { border-color: var(--primary); color: var(--primary); transform: scale(1.05); }

    .empty-checkout { text-align: center; padding: 4rem 2rem; background: white; border-radius: 24px; border: 1.5px solid var(--line); }
    .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    .primary-btn { background: var(--primary); color: white; border: none; padding: 1rem 2rem; border-radius: 99px; font-weight: 700; cursor: pointer; margin-top: 1.5rem; }

    .checkout-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2.5rem; align-items: flex-start; }
    
    .checkout-main { display: grid; gap: 1.5rem; }
    .checkout-section { background: white; border-radius: 24px; border: 1.5px solid var(--line); padding: 1.8rem; }
    .section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: white; font-size: 0.8rem; font-weight: 800; display: grid; place-items: center; }
    .section-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; }

    .delivery-card { display: grid; gap: 1rem; }
    .input-group { display: grid; gap: 0.5rem; }
    .input-group label { font-size: 0.85rem; font-weight: 700; color: var(--muted); }
    .input-wrapper { position: relative; }
    .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: var(--muted); fill: currentColor; }
    .input-wrapper input { width: 100%; padding: 1rem 1rem 1rem 3rem; border-radius: 14px; border: 1.5px solid var(--line); font-size: 1rem; background: var(--bg-app); transition: all 0.2s; }
    .input-wrapper input:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px var(--primary-soft); }

    .payment-options { display: grid; gap: 1rem; }
    .pay-option { display: flex; align-items: center; gap: 1.2rem; padding: 1.2rem; border-radius: 18px; border: 2px solid var(--line); background: white; cursor: pointer; text-align: left; transition: all 0.2s; position: relative; }
    .pay-option:hover { border-color: var(--primary-mid); background: var(--bg-app); }
    .pay-option.active { border-color: var(--primary); background: var(--primary-soft); }
    .pay-option__icon { font-size: 1.8rem; }
    .pay-option__text { flex: 1; display: grid; gap: 2px; }
    .pay-option__text strong { font-size: 1rem; font-weight: 800; }
    .pay-option__text span { font-size: 0.8rem; color: var(--muted); }
    .radio-circle { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--line); position: relative; }
    .pay-option.active .radio-circle { border-color: var(--primary); }
    .pay-option.active .radio-circle::after { content: ''; position: absolute; inset: 4px; background: var(--primary); border-radius: 50%; }

    .items-list { display: grid; gap: 0.8rem; }
    .item-row { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; font-size: 0.95rem; }
    .item-qty { font-weight: 800; color: var(--primary); min-width: 30px; }
    .item-name { flex: 1; font-weight: 600; }
    .item-price { font-weight: 700; color: var(--ink); }

    .checkout-summary { position: sticky; top: 100px; }
    .summary-card { background: var(--ink); color: white; padding: 2rem; border-radius: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
    .summary-card h3 { margin: 0 0 1.5rem; font-size: 1.4rem; font-weight: 850; }
    .summary-rows { display: grid; gap: 1rem; margin-bottom: 2rem; }
    .summary-row { display: flex; justify-content: space-between; font-size: 1rem; opacity: 0.8; }
    .summary-row.total { opacity: 1; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 1.2rem; font-weight: 800; }
    .summary-row.total strong { font-size: 1.6rem; color: var(--primary); }

    .confirm-btn { width: 100%; padding: 1.2rem; border-radius: 99px; border: none; background: var(--primary); color: white; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(255,68,31,0.3); margin-bottom: 1rem; display: flex; justify-content: center; align-items: center; }
    .confirm-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(255,68,31,0.4); }
    .confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .error-msg { background: rgba(255,0,0,0.1); color: #ff6b6b; padding: 0.8rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; margin-bottom: 1rem; text-align: center; }
    .terms { font-size: 0.72rem; opacity: 0.5; text-align: center; line-height: 1.4; }

    .loader { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .anim-fade-in { animation: fadeIn 0.4s ease-out; }
    .anim-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    .anim-shake { animation: shake 0.4s linear; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

    @media (max-width: 1000px) {
      .checkout-grid { grid-template-columns: 1fr; }
      .checkout-summary { position: static; }
    }
  `
})
export class ClientCheckoutPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly orderState = inject(ClientOrderStateService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly cart = this.orderState.cart;
  protected readonly selectedRestaurantId = this.orderState.selectedRestaurantId;
  protected readonly selectedRestaurantName = this.orderState.selectedRestaurantName;
  protected readonly cartSubtotal = this.orderState.cartSubtotal;
  protected readonly deliveryFee = DELIVERY_FEE;
  protected readonly profile = this.profileService.profile;

  protected deliveryAddress = '';
  protected paymentMethod = 'SIMULATED_CARD';
  protected placingOrder = false;
  protected errorMessage = '';

  constructor() {
    this.initAddress();
  }

  private async initAddress() {
    await this.profileService.ensureLoaded();
    const p = this.profile();
    if (p?.address) {
      this.deliveryAddress = p.address;
    } else {
      const savedAddress = localStorage.getItem('last_delivery_address');
      if (savedAddress) this.deliveryAddress = savedAddress;
    }
  }

  protected async confirmOrder(): Promise<void> {
    const rid = this.selectedRestaurantId();
    if (!rid || !this.cart().length) return;

    this.placingOrder = true;
    this.errorMessage = '';

    try {
      const currentAddress = this.deliveryAddress.trim();
      localStorage.setItem('last_delivery_address', currentAddress);
      
      // Si la persona no tiene dirección en su perfil, o es diferente, la actualizamos
      const p = this.profile();
      if (p && (!p.address || p.address !== currentAddress)) {
        try {
          await this.profileService.upsertProfile({
            fullName: p.fullName,
            role: p.role,
            phone: p.phone ?? undefined,
            address: currentAddress
          });
        } catch (e) {
          console.warn('No se pudo actualizar la dirección del perfil, pero procedemos con el pedido.');
        }
      }

      await this.apiService.createOrder({
        restaurantId: rid,
        deliveryAddress: currentAddress,
        paymentMethod: this.paymentMethod,
        items: this.cart().map(i => ({ productId: i.productId, quantity: i.quantity }))
      });

      this.orderState.clearCart();
      await this.router.navigateByUrl('/orders');
    } catch (error) {
      this.errorMessage = this.toError(error, 'No se pudo procesar el pago.');
    } finally {
      this.placingOrder = false;
    }
  }

  private toError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return (error.error as any)?.error || fallback;
    }
    return fallback;
  }
}
