import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import type { Product, Restaurant } from '../core/models';

@Component({
  selector: 'app-client-shop-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Step 1: Restaurant selection -->
    <article class="card">
      <div class="card-header">
        <div class="card-header__left">
          <span class="step-badge">01</span>
          <h3>Elige un restaurante</h3>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="loadRestaurants()" [disabled]="loadingRestaurants">
          @if (loadingRestaurants) { <span class="spinner"></span> Cargando... }
          @else { ↻ Recargar }
        </button>
      </div>

      @if (!restaurants.length) {
        <div class="empty-state">
          <span class="empty-state__icon">🍽️</span>
          <p>No hay restaurantes disponibles en este momento.</p>
        </div>
      } @else {
        <div class="restaurant-grid">
          @for (restaurant of restaurants; track restaurant.id) {
            <button
              type="button"
              class="restaurant-card"
              [class.active]="restaurant.id === selectedRestaurantId()"
              (click)="selectRestaurant(restaurant)"
            >
              <div class="restaurant-card__status">
                <span class="status-dot" [class.open]="restaurant.is_open"></span>
                {{ restaurant.is_open ? 'Abierto' : 'Cerrado' }}
              </div>
              <strong class="restaurant-card__name">{{ restaurant.name }}</strong>
              <span class="restaurant-card__desc">{{ restaurant.description || 'Sin descripción.' }}</span>
              @if (restaurant.id === selectedRestaurantId()) {
                <span class="restaurant-card__selected">✓ Seleccionado</span>
              }
            </button>
          }
        </div>
      }
    </article>

    <!-- Step 2: Menu & cart -->
    <article class="card">
      <div class="card-header">
        <div class="card-header__left">
          <span class="step-badge">02</span>
          <h3>Menú
            @if (selectedRestaurantName()) {
              <span class="card-header__subtitle">— {{ selectedRestaurantName() }}</span>
            }
          </h3>
        </div>
      </div>

      @if (!selectedRestaurantId()) {
        <div class="empty-state">
          <span class="empty-state__icon">👆</span>
          <p>Selecciona un restaurante para ver su menú.</p>
        </div>
      } @else if (loadingProducts) {
        <div class="empty-state">
          <span class="spinner spinner--lg"></span>
          <p>Cargando menú...</p>
        </div>
      } @else if (!products.length) {
        <div class="empty-state">
          <span class="empty-state__icon">📋</span>
          <p>Este restaurante aún no tiene productos publicados.</p>
        </div>
      } @else {
        <div class="catalog">
          @for (product of products; track product.id) {
            <article class="product-card">
              <div class="product-card__img-wrap">
                <img
                  [src]="product.image_url || defaultProductImage"
                  [alt]="product.name"
                  loading="lazy"
                />
              </div>
              <div class="product-card__body">
                <div class="product-card__top">
                  <strong>{{ product.name }}</strong>
                  <span class="price">\${{ asPrice(product.price) }}</span>
                </div>
                @if (product.description) {
                  <span class="product-card__desc">{{ product.description }}</span>
                }
                @if (product.category) {
                  <span class="category-tag">{{ product.category }}</span>
                }
                <button type="button" class="btn btn--primary btn--sm" (click)="addToCart(product)">
                  + Agregar
                </button>
              </div>
            </article>
          }
        </div>
      }

      <!-- Cart summary bar -->
      <div class="cart-bar">
        <div class="cart-bar__info">
          @if (!cart().length) {
            <span class="cart-bar__empty">Tu carrito está vacío</span>
          } @else {
            <div class="cart-bar__count">
              <span class="cart-badge">{{ cartItemsCount() }}</span>
              <span>producto(s)</span>
            </div>
            <strong class="cart-bar__total">\${{ cartSubtotal().toFixed(2) }}</strong>
          }
        </div>
        <button
          type="button"
          class="btn btn--primary"
          (click)="goToCheckout()"
          [disabled]="!cart().length"
        >
          Proceder al pago →
        </button>
      </div>
    </article>

    @if (message) {
      <div class="alert alert--success">✓ {{ message }}</div>
    }
    @if (errorMessage) {
      <div class="alert alert--error">{{ errorMessage }}</div>
    }
  `,
  styles: `
    /* ── Card ── */
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

    .card-header__subtitle {
      font-size: 0.85em;
      font-weight: 500;
      color: var(--muted);
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
      background: var(--surface);
    }

    .btn--sm { padding: 0.38rem 0.8rem; font-size: 0.82rem; }

    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) 0;
      text-align: center;
    }

    .empty-state__icon { font-size: 2.5rem; line-height: 1; }
    .empty-state p { margin: 0; color: var(--muted); font-size: 0.9rem; }

    /* ── Restaurant grid ── */
    .restaurant-grid {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .restaurant-card {
      position: relative;
      width: 100%;
      text-align: left;
      border: 1.5px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      padding: var(--space-4);
      display: grid;
      gap: var(--space-2);
      cursor: pointer;
      transition: all 0.2s ease;
      align-content: start;
      min-height: 130px;
    }

    .restaurant-card:hover {
      transform: translateY(-2px);
      border-color: var(--line-strong);
      box-shadow: 0 8px 24px rgba(150, 80, 30, 0.1);
      background: var(--surface);
    }

    .restaurant-card.active {
      border-color: var(--primary);
      background: var(--primary-soft);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.1);
    }

    .restaurant-card__status {
      display: flex;
      align-items: center;
      gap: 0.38rem;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--muted);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--muted-2);
      flex-shrink: 0;
    }

    .status-dot.open {
      background: var(--success);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.18);
      animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .restaurant-card__name { font-size: 0.95rem; font-weight: 700; color: var(--ink); }
    .restaurant-card__desc { font-size: 0.82rem; color: var(--muted); line-height: 1.4; }

    .restaurant-card__selected {
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--primary-strong);
      margin-top: var(--space-1);
    }

    /* ── Catalog ── */
    .catalog {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .product-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
      transition: all 0.18s ease;
    }

    .product-card:hover {
      border-color: var(--line-strong);
      box-shadow: var(--shadow-sm);
      transform: translateY(-1px);
    }

    .product-card__img-wrap {
      width: 100%;
      aspect-ratio: 4/3;
      overflow: hidden;
      background: #fff4ed;
    }

    .product-card__img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .product-card__body {
      padding: var(--space-3);
      display: grid;
      gap: var(--space-2);
      align-content: start;
    }

    .product-card__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .product-card__top strong { font-size: 0.92rem; font-weight: 700; color: var(--ink); line-height: 1.3; }
    .price { font-weight: 800; color: var(--primary-strong); font-size: 0.95rem; white-space: nowrap; }
    .product-card__desc { font-size: 0.8rem; color: var(--muted); line-height: 1.45; }

    .category-tag {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--muted);
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.15rem 0.55rem;
      width: fit-content;
    }

    /* ── Cart bar ── */
    .cart-bar {
      border-top: 1px solid var(--line);
      padding-top: var(--space-4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .cart-bar__info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .cart-bar__empty { color: var(--muted); font-size: 0.9rem; }

    .cart-bar__count {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ink);
    }

    .cart-badge {
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      display: grid;
      place-items: center;
    }

    .cart-bar__total {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--ink);
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

    .spinner--lg { width: 2rem; height: 2rem; border-width: 3px; margin: var(--space-4) auto 0; }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Alerts ── */
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .alert--success {
      background: var(--success-soft);
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .alert--error {
      background: var(--danger-soft);
      border: 1px solid #fecaca;
      color: var(--danger);
    }
  `
})
export class ClientShopPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly orderState = inject(ClientOrderStateService);
  private readonly router = inject(Router);

  protected readonly defaultProductImage = 'assets/placeholder-food.svg';
  protected readonly cart = this.orderState.cart;
  protected readonly cartSubtotal = this.orderState.cartSubtotal;
  protected readonly cartItemsCount = this.orderState.cartItemsCount;
  protected readonly selectedRestaurantId = this.orderState.selectedRestaurantId;
  protected readonly selectedRestaurantName = this.orderState.selectedRestaurantName;

  protected restaurants: Restaurant[] = [];
  protected products: Product[] = [];

  protected loadingRestaurants = false;
  protected loadingProducts = false;

  protected message = '';
  protected errorMessage = '';

  constructor() {
    void this.boot();
  }

  protected asPrice(value: number | string): string {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  protected async selectRestaurant(restaurant: Restaurant): Promise<void> {
    this.message = '';
    this.errorMessage = '';

    const selected = this.selectedRestaurantId();
    if (selected && selected !== restaurant.id && this.cart().length > 0) {
      const confirmed = window.confirm(
        'Si cambias de restaurante se vaciará el carrito actual. ¿Deseas continuar?'
      );
      if (!confirmed) return;
      this.orderState.clearCart();
    }

    this.orderState.setRestaurant(restaurant.id, restaurant.name);
    await this.loadProducts(restaurant.id);
  }

  protected addToCart(product: Product): void {
    this.message = '';
    this.errorMessage = '';
    this.orderState.addProduct(product);
    this.message = `${product.name} agregado al carrito.`;
  }

  protected async loadRestaurants(): Promise<void> {
    this.loadingRestaurants = true;
    this.errorMessage = '';
    try {
      this.restaurants = await this.apiService.getRestaurants();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar restaurantes.');
    } finally {
      this.loadingRestaurants = false;
    }
  }

  protected async goToCheckout(): Promise<void> {
    this.message = '';
    this.errorMessage = '';
    if (!this.cart().length) {
      this.errorMessage = 'Agrega al menos un producto antes de continuar al pago.';
      return;
    }
    await this.router.navigateByUrl('/client/checkout');
  }

  private async boot(): Promise<void> {
    await this.loadRestaurants();

    const selectedId = this.selectedRestaurantId();
    if (!selectedId) return;

    const selected = this.restaurants.find((item) => item.id === selectedId);
    if (!selected) {
      this.orderState.clearAll();
      return;
    }

    if (!this.selectedRestaurantName()) {
      this.orderState.setRestaurant(selected.id, selected.name);
    }
    await this.loadProducts(selected.id);
  }

  private async loadProducts(restaurantId: number): Promise<void> {
    this.loadingProducts = true;
    this.errorMessage = '';
    try {
      this.products = await this.apiService.getProductsByRestaurant(restaurantId);
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar el menú.');
    } finally {
      this.loadingProducts = false;
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