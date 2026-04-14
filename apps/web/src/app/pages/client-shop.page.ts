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
    <article class="card">
      <div class="card-title">
        <h3>Paso 1: Restaurante</h3>
        <button type="button" class="ghost" (click)="loadRestaurants()" [disabled]="loadingRestaurants">
          {{ loadingRestaurants ? 'Cargando...' : 'Recargar' }}
        </button>
      </div>

      @if (!restaurants.length) {
        <p class="muted">No hay restaurantes disponibles.</p>
      } @else {
        <div class="restaurant-grid">
          @for (restaurant of restaurants; track restaurant.id) {
            <button
              type="button"
              class="restaurant-card"
              [class.active]="restaurant.id === selectedRestaurantId()"
              (click)="selectRestaurant(restaurant)"
            >
              <strong>{{ restaurant.name }}</strong>
              <span class="meta">{{ restaurant.description || 'Sin descripcion.' }}</span>
              <span class="meta">{{ restaurant.is_open ? 'Abierto' : 'Cerrado temporalmente' }}</span>
            </button>
          }
        </div>
      }
    </article>

    <article class="card">
      <div class="card-title">
        <h3>Paso 2: Menu</h3>
        @if (selectedRestaurantName()) {
          <span class="muted">{{ selectedRestaurantName() }}</span>
        }
      </div>

      @if (!selectedRestaurantId()) {
        <p class="muted">Selecciona un restaurante para ver su menu.</p>
      } @else if (loadingProducts) {
        <p class="muted">Cargando menu...</p>
      } @else if (!products.length) {
        <p class="muted">Este restaurante aun no tiene productos publicados.</p>
      } @else {
        <div class="catalog">
          @for (product of products; track product.id) {
            <article class="product-card">
              <img
                class="product-thumb"
                [src]="product.image_url || defaultProductImage"
                [alt]="product.name"
                loading="lazy"
              />
              <div class="row">
                <strong>{{ product.name }}</strong>
                <span>\${{ asPrice(product.price) }}</span>
              </div>
              @if (product.description) {
                <span class="meta">{{ product.description }}</span>
              }
              <span class="meta">{{ product.category || 'Sin categoria' }}</span>
              <button type="button" (click)="addToCart(product)">Agregar al carrito</button>
            </article>
          }
        </div>
      }

      <div class="checkout-summary">
        @if (!cart().length) {
          <p class="muted">Carrito vacio.</p>
        } @else {
          <div>
            <strong>{{ cartItemsCount() }} producto(s)</strong>
            <p class="muted">Subtotal: \${{ cartSubtotal().toFixed(2) }}</p>
          </div>
        }
        <button type="button" (click)="goToCheckout()" [disabled]="!cart().length">
          Proceder al pago
        </button>
      </div>
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
    .card + .card { margin-top: var(--space-4); }
    .card-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .card-title h3 { margin: 0; }
    .restaurant-grid {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: var(--space-4);
    }
    .restaurant-card {
      width: 100%;
      text-align: left;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      min-height: 132px;
      padding: var(--space-4);
      display: grid;
      gap: var(--space-2);
      cursor: pointer;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }
    .restaurant-card:hover {
      transform: translateY(-1px);
      border-color: var(--line-strong);
      box-shadow: 0 10px 20px rgb(180 84 35 / 10%);
    }
    .restaurant-card.active {
      border-color: var(--primary);
      background: var(--primary-soft);
    }
    .catalog {
      margin-top: var(--space-4);
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .product-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      padding: var(--space-3);
      display: grid;
      gap: var(--space-2);
    }
    .product-thumb {
      width: 100%;
      height: 148px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fff;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .meta { font-size: 0.88rem; color: var(--muted); line-height: 1.4; }
    .checkout-summary {
      margin-top: var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      padding: var(--space-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
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
    .muted { color: var(--muted); margin: 0; }
    .message { color: var(--primary); font-weight: 700; margin-top: var(--space-4); }
    .error { color: var(--danger); font-weight: 700; margin-top: var(--space-4); }
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
        'Si cambias de restaurante se vaciara el carrito actual. Deseas continuar?'
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
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar el menu.');
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
