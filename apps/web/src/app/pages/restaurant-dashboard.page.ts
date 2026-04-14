import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { OrderSummary, OwnedRestaurant, Product } from '../core/models';

@Component({
  selector: 'app-restaurant-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <h2>Modulo Restaurante</h2>
      <p>Un restaurante por cuenta. Configura perfil, publica platillos y revisa pedidos.</p>

      <article class="card">
        <h3>Perfil del restaurante</h3>
        <form class="form" (submit)="saveRestaurant($event)">
          <label>
            Nombre del restaurante
            <input
              type="text"
              name="restaurantName"
              [(ngModel)]="restaurantForm.name"
              required
              minlength="2"
            />
          </label>

          <label>
            Direccion
            <input
              type="text"
              name="restaurantAddress"
              [(ngModel)]="restaurantForm.address"
              required
              minlength="4"
            />
          </label>

          <label>
            Descripcion (opcional)
            <input
              type="text"
              name="restaurantDescription"
              [(ngModel)]="restaurantForm.description"
            />
          </label>

          <label>
            Telefono (opcional)
            <input type="text" name="restaurantPhone" [(ngModel)]="restaurantForm.phone" />
          </label>

          <label class="checkbox">
            <input
              type="checkbox"
              name="restaurantIsOpen"
              [(ngModel)]="restaurantForm.isOpen"
            />
            Abierto para recibir pedidos
          </label>

          <button type="submit" [disabled]="savingRestaurant">
            {{ savingRestaurant ? 'Guardando...' : hasRestaurant ? 'Actualizar perfil' : 'Crear restaurante' }}
          </button>
        </form>
      </article>

      <article class="card">
        <h3>Platillos / Productos</h3>
        @if (!hasRestaurant) {
          <p class="muted">Primero crea tu restaurante para poder publicar platillos.</p>
        } @else {
          <form class="form form-inline" (submit)="createProduct($event)">
            <label>
              Nombre
              <input type="text" name="productName" [(ngModel)]="productForm.name" required />
            </label>
            <label>
              Precio
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="productPrice"
                [(ngModel)]="productForm.price"
                required
              />
            </label>
            <label>
              Categoria
              <input type="text" name="productCategory" [(ngModel)]="productForm.category" />
            </label>
            <label>
              Descripcion
              <input type="text" name="productDescription" [(ngModel)]="productForm.description" />
            </label>
            <label>
              Imagen (URL)
              <input
                type="url"
                name="productImageUrl"
                [(ngModel)]="productForm.imageUrl"
                placeholder="https://..."
              />
            </label>
            <label class="checkbox">
              <input
                type="checkbox"
                name="productAvailable"
                [(ngModel)]="productForm.available"
              />
              Disponible
            </label>
            <button type="submit" [disabled]="savingProduct">
              {{ savingProduct ? 'Publicando...' : 'Publicar platillo' }}
            </button>
          </form>

          @if (!products.length) {
            <p class="muted">No hay platillos publicados.</p>
          } @else {
            <ul class="list">
              @for (product of products; track product.id) {
                <li>
                  <div class="product-row">
                    <img
                      class="product-thumb"
                      [src]="product.image_url || defaultProductImage"
                      [alt]="product.name"
                      loading="lazy"
                    />
                    <div class="product-body">
                      <div class="row">
                        <strong>{{ product.name }}</strong>
                        <span>\${{ product.price }}</span>
                      </div>
                      @if (product.description) {
                        <span class="meta">{{ product.description }}</span>
                      }
                      <span class="meta">
                        {{ product.category || 'Sin categoria' }} |
                        {{ product.available ? 'Disponible' : 'No disponible' }}
                      </span>
                      <div class="actions">
                        <button
                          type="button"
                          class="ghost"
                          (click)="toggleAvailability(product)"
                          [disabled]="savingProduct"
                        >
                          {{ product.available ? 'Marcar no disponible' : 'Marcar disponible' }}
                        </button>
                        <button
                          type="button"
                          class="danger"
                          (click)="deleteProduct(product.id)"
                          [disabled]="savingProduct"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        }
      </article>

      <article class="card">
        <div class="card-title">
          <h3>Pedidos de mi restaurante</h3>
          <button type="button" class="ghost" (click)="loadOrders()" [disabled]="loadingOrders">
            {{ loadingOrders ? 'Cargando...' : 'Recargar pedidos' }}
          </button>
        </div>
        @if (!orders.length) {
          <p class="muted">No hay pedidos asociados al restaurante aun.</p>
        } @else {
          <ul class="list">
            @for (order of orders; track order.id) {
              <li>
                <strong>#{{ order.id }} - {{ order.status }}</strong>
                <span class="meta">Total: {{ order.total }}</span>
                <div class="actions">
                  @if (canAcceptOrder(order.status)) {
                    <button
                      type="button"
                      (click)="updateOrderStatus(order.id, 'ACCEPTED')"
                      [disabled]="updatingOrderId === order.id"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Aceptar' }}
                    </button>
                  }
                  @if (canRejectOrder(order.status)) {
                    <button
                      type="button"
                      class="danger"
                      (click)="updateOrderStatus(order.id, 'REJECTED')"
                      [disabled]="updatingOrderId === order.id"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Rechazar' }}
                    </button>
                  }
                  @if (canMarkReady(order.status)) {
                    <button
                      type="button"
                      (click)="updateOrderStatus(order.id, 'READY_FOR_PICKUP')"
                      [disabled]="updatingOrderId === order.id"
                    >
                      {{ updatingOrderId === order.id ? 'Actualizando...' : 'Marcar listo para pickup' }}
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
    .form { display: grid; gap: 0.7rem; margin-top: 0.6rem; }
    .form-inline { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); align-items: end; }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; }
    .checkbox { display: flex; align-items: center; gap: 0.4rem; }
    input {
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      padding: 0.5rem 0.62rem;
      font: inherit;
      background: var(--surface);
    }
    button {
      border: 0;
      border-radius: 999px;
      padding: 0.42rem 0.82rem;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    .ghost { background: var(--surface); border: 1px solid var(--line); color: var(--ink); }
    .danger { background: var(--danger); }
    .list { list-style: none; margin: 0.8rem 0 0; padding: 0; display: grid; gap: 0.45rem; }
    .list li { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 0.55rem 0.62rem; display: grid; gap: 0.3rem; }
    .product-row { display: grid; grid-template-columns: 92px 1fr; gap: 0.65rem; align-items: start; }
    .product-thumb {
      width: 92px;
      height: 92px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fff;
    }
    .product-body { display: grid; gap: 0.3rem; }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; }
    .meta { color: var(--muted); font-size: 0.88rem; }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; margin-top: 0.2rem; }
    .muted { margin-top: 0.7rem; }
    .message { color: var(--primary); font-weight: 600; margin-top: 0.9rem; }
    .error { color: var(--danger); font-weight: 600; margin-top: 0.9rem; }
  `
})
export class RestaurantDashboardPageComponent {
  protected readonly defaultProductImage = 'assets/placeholder-food.svg';

  protected restaurant: OwnedRestaurant | null = null;
  protected hasRestaurant = false;
  protected products: Product[] = [];
  protected orders: OrderSummary[] = [];

  protected savingRestaurant = false;
  protected savingProduct = false;
  protected loadingOrders = false;
  protected updatingOrderId: number | null = null;

  protected message = '';
  protected errorMessage = '';

  protected restaurantForm = {
    name: '',
    address: '',
    description: '',
    phone: '',
    isOpen: true
  };

  protected productForm = {
    name: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: '',
    available: true
  };

  constructor(private readonly apiService: ApiService) {
    void this.boot();
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadRestaurant(), this.loadOrders()]);
  }

  protected async saveRestaurant(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';
    this.savingRestaurant = true;
    try {
      this.restaurant = await this.apiService.upsertMyRestaurant({
        name: this.restaurantForm.name.trim(),
        address: this.restaurantForm.address.trim(),
        description: this.restaurantForm.description.trim() || undefined,
        phone: this.restaurantForm.phone.trim() || undefined,
        isOpen: this.restaurantForm.isOpen
      });
      this.hasRestaurant = true;
      this.message = 'Restaurante guardado correctamente.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo guardar el restaurante.');
    } finally {
      this.savingRestaurant = false;
    }
  }

  protected async createProduct(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      await this.apiService.createMyRestaurantProduct({
        name: this.productForm.name.trim(),
        price: Number(this.productForm.price),
        category: this.productForm.category.trim() || undefined,
        description: this.productForm.description.trim() || undefined,
        imageUrl: this.productForm.imageUrl.trim() || undefined,
        available: this.productForm.available
      });
      this.message = 'Platillo publicado.';
      this.productForm = {
        name: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: '',
        available: true
      };
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear el platillo.');
    } finally {
      this.savingProduct = false;
    }
  }

  protected async toggleAvailability(product: Product): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      await this.apiService.updateMyRestaurantProduct(product.id, {
        available: !product.available
      });
      this.message = 'Disponibilidad actualizada.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(
        error,
        'No se pudo actualizar la disponibilidad.'
      );
    } finally {
      this.savingProduct = false;
    }
  }

  protected async deleteProduct(productId: number): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      await this.apiService.deleteMyRestaurantProduct(productId);
      this.message = 'Platillo eliminado.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo eliminar el platillo.');
    } finally {
      this.savingProduct = false;
    }
  }

  protected async loadOrders(): Promise<void> {
    this.loadingOrders = true;
    this.errorMessage = '';
    try {
      this.orders = await this.apiService.getMyOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos.');
    } finally {
      this.loadingOrders = false;
    }
  }

  protected canAcceptOrder(status: string): boolean {
    return status === 'PENDING';
  }

  protected canRejectOrder(status: string): boolean {
    return status === 'PENDING';
  }

  protected canMarkReady(status: string): boolean {
    return status === 'ACCEPTED';
  }

  protected async updateOrderStatus(
    orderId: number,
    status: 'ACCEPTED' | 'REJECTED' | 'READY_FOR_PICKUP'
  ): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.updatingOrderId = orderId;
    try {
      await this.apiService.updateOrderStatus(orderId, {
        status,
        reason: status === 'REJECTED' ? 'Rejected by restaurant' : undefined
      });
      this.message = `Pedido #${orderId} actualizado a ${status}.`;
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar el pedido.');
    } finally {
      this.updatingOrderId = null;
    }
  }

  private async loadRestaurant(): Promise<void> {
    this.errorMessage = '';
    try {
      this.restaurant = await this.apiService.getMyRestaurant();
      this.hasRestaurant = Boolean(this.restaurant);
      if (!this.restaurant) return;

      this.restaurantForm = {
        name: this.restaurant.name,
        address: this.restaurant.address,
        description: this.restaurant.description ?? '',
        phone: this.restaurant.phone ?? '',
        isOpen: this.restaurant.is_open
      };
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar restaurante.');
    }
  }

  private async loadProducts(): Promise<void> {
    this.products = await this.apiService.getMyRestaurantProducts();
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
