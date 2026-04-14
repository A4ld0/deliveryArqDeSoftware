import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type {
  IncidentItem,
  OrderStatusEvent,
  OrderSummary,
  Product,
  Restaurant
} from '../core/models';
import { OrderEventsService } from '../core/order-events.service';

interface CartLine {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

type ViewMode = 'restaurants' | 'menu' | 'checkout';

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <h2>Modulo Cliente</h2>
      <p>Flujo simple: elige restaurante, agrega productos y confirma tu pedido.</p>

      <article class="card">
        <div class="card-title">
          <h3>Paso 1: Elige restaurante</h3>
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
                [class.active]="restaurant.id === selectedRestaurantId"
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

      @if (selectedRestaurantId) {
        <article class="card">
          <div class="card-title">
            <h3>{{ viewMode === 'checkout' ? 'Paso 3: Confirma pedido' : 'Paso 2: Menu' }}</h3>
            <div class="actions">
              <button type="button" class="ghost" (click)="backToRestaurants()">Cambiar restaurante</button>
              @if (viewMode === 'checkout') {
                <button type="button" class="ghost" (click)="returnToMenu()">Volver al menu</button>
              }
            </div>
          </div>

          <p class="muted">{{ selectedRestaurantName }}</p>

          @if (viewMode === 'menu') {
            @if (loadingProducts) {
              <p class="muted">Cargando menu...</p>
            } @else if (!products.length) {
              <p class="muted">Este restaurante aun no tiene productos disponibles.</p>
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
              @if (!cart.length) {
                <p class="muted">Tu carrito esta vacio.</p>
              } @else {
                <div>
                  <strong>{{ cartItemsCount }} producto(s)</strong>
                  <p class="muted">Subtotal: \${{ cartSubtotal.toFixed(2) }}</p>
                </div>
              }
              <button type="button" (click)="goToCheckout()" [disabled]="!cart.length">
                Proceder al pago
              </button>
            </div>
          }

          @if (viewMode === 'checkout') {
            @if (!cart.length) {
              <p class="muted">Tu carrito esta vacio. Regresa al menu para agregar productos.</p>
            } @else {
              <ul class="list">
                @for (line of cart; track line.productId) {
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

              <p class="total">Subtotal: <strong>\${{ cartSubtotal.toFixed(2) }}</strong></p>

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
          }
        </article>
      }

      <article class="card">
        <div class="card-title">
          <h3>Mis pedidos</h3>
          <button type="button" class="ghost" (click)="loadOrders()" [disabled]="loadingOrders">
            {{ loadingOrders ? 'Cargando...' : 'Recargar' }}
          </button>
        </div>

        @if (!orders.length) {
          <p class="muted">Sin pedidos todavia.</p>
        } @else {
          <ul class="list">
            @for (order of orders; track order.id) {
              <li>
                <div class="row">
                  <strong>#{{ order.id }} - {{ order.status }}</strong>
                  <span>Total: {{ order.total }}</span>
                </div>
                @if (canCancel(order.status)) {
                  <button
                    type="button"
                    class="danger"
                    (click)="cancelOrder(order.id)"
                    [disabled]="cancellingOrderId === order.id"
                  >
                    {{ cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar pedido' }}
                  </button>
                }
              </li>
            }
          </ul>
        }
      </article>

      <article class="card">
        <h3>Reportar incidencia</h3>
        @if (!orders.length) {
          <p class="muted">Necesitas al menos un pedido para reportar incidencia.</p>
        } @else {
          <form class="form" (submit)="createIncident($event)">
            <label>
              Pedido
              <select name="incidentOrderId" [(ngModel)]="incidentOrderId" required>
                @for (order of orders; track order.id) {
                  <option [ngValue]="order.id">#{{ order.id }} - {{ order.status }}</option>
                }
              </select>
            </label>

            <label>
              Titulo
              <input
                type="text"
                name="incidentTitle"
                [(ngModel)]="incidentTitle"
                required
                minlength="5"
                maxlength="120"
              />
            </label>

            <label>
              Descripcion
              <input
                type="text"
                name="incidentDescription"
                [(ngModel)]="incidentDescription"
                required
                minlength="10"
                maxlength="500"
              />
            </label>

            <button type="submit" [disabled]="savingIncident">
              {{ savingIncident ? 'Enviando...' : 'Enviar incidencia' }}
            </button>
          </form>
        }

        <div class="card-title incidents-title">
          <h3>Mis incidencias</h3>
          <button type="button" class="ghost" (click)="loadIncidents()" [disabled]="loadingIncidents">
            {{ loadingIncidents ? 'Cargando...' : 'Recargar incidencias' }}
          </button>
        </div>

        @if (!incidents.length) {
          <p class="muted">No has reportado incidencias.</p>
        } @else {
          <ul class="list">
            @for (incident of incidents; track incident.id) {
              <li>
                <div class="row">
                  <strong>#{{ incident.id }} - {{ incident.status }}</strong>
                  <span>Pedido #{{ incident.order_id }}</span>
                </div>
                <strong>{{ incident.title }}</strong>
                <span class="meta">{{ incident.description }}</span>
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
    .card-title { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
    .card-title h3 { margin: 0; }
    .incidents-title { margin-top: 0.8rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; margin-top: 0.6rem; }
    input, select {
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      padding: 0.5rem 0.62rem;
      font: inherit;
      background: var(--surface);
    }
    .restaurant-grid {
      display: grid;
      gap: 0.6rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: 0.75rem;
    }
    .restaurant-card {
      width: 100%;
      text-align: left;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      padding: 0.65rem;
      display: grid;
      gap: 0.25rem;
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
    .list { list-style: none; margin: 0.75rem 0 0; padding: 0; display: grid; gap: 0.45rem; }
    .list li { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 0.55rem 0.62rem; display: grid; gap: 0.3rem; }
    .catalog { margin-top: 0.75rem; display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .product-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      padding: 0.6rem;
      display: grid;
      gap: 0.4rem;
    }
    .product-thumb {
      width: 100%;
      height: 130px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fff;
    }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .meta { font-size: 0.88rem; color: var(--muted); }
    .qty { display: flex; align-items: center; gap: 0.4rem; }
    .total { margin-top: 0.7rem; }
    .checkout-summary {
      margin-top: 0.8rem;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      padding: 0.7rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .form { display: grid; gap: 0.6rem; margin-top: 0.65rem; }
    .actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
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
    .muted { margin-top: 0.5rem; }
    .message { color: var(--primary); font-weight: 600; margin-top: 0.9rem; }
    .error { color: var(--danger); font-weight: 600; margin-top: 0.9rem; }
  `
})
export class ClientDashboardPageComponent implements OnDestroy {
  private static readonly CART_KEY = 'delivery.client.cart.v1';
  protected readonly defaultProductImage = 'assets/placeholder-food.svg';

  protected viewMode: ViewMode = 'restaurants';
  protected restaurants: Restaurant[] = [];
  protected selectedRestaurantId: number | null = null;
  protected selectedRestaurantName = '';
  protected products: Product[] = [];

  protected cart: CartLine[] = [];
  protected deliveryAddress = '';
  protected paymentMethod = 'SIMULATED_CARD';

  protected orders: OrderSummary[] = [];
  protected incidents: IncidentItem[] = [];

  protected loadingRestaurants = false;
  protected loadingProducts = false;
  protected placingOrder = false;
  protected loadingOrders = false;
  protected loadingIncidents = false;
  protected cancellingOrderId: number | null = null;
  protected savingIncident = false;

  protected message = '';
  protected errorMessage = '';
  protected incidentOrderId: number | null = null;
  protected incidentTitle = '';
  protected incidentDescription = '';

  private eventSource: EventSource | null = null;

  constructor(
    private readonly apiService: ApiService,
    private readonly orderEventsService: OrderEventsService
  ) {
    void this.boot();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  protected get cartSubtotal(): number {
    return this.cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  }

  protected get cartItemsCount(): number {
    return this.cart.reduce((sum, line) => sum + line.quantity, 0);
  }

  protected asPrice(value: number | string): string {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  protected async selectRestaurant(restaurant: Restaurant): Promise<void> {
    this.message = '';
    this.errorMessage = '';

    if (
      this.selectedRestaurantId &&
      this.selectedRestaurantId !== restaurant.id &&
      this.cart.length > 0
    ) {
      const confirmed = window.confirm(
        'Si cambias de restaurante se vaciara el carrito actual. Deseas continuar?'
      );
      if (!confirmed) return;
      this.clearCart();
    }

    this.selectedRestaurantId = restaurant.id;
    this.selectedRestaurantName = restaurant.name;
    this.viewMode = 'menu';
    await this.loadProducts(restaurant.id);
  }

  protected backToRestaurants(): void {
    this.message = '';
    this.errorMessage = '';

    if (this.cart.length > 0) {
      const confirmed = window.confirm(
        'Estas seguro que quieres salir? Se vaciara el carrito actual.'
      );
      if (!confirmed) return;
      this.clearCart();
    }

    this.viewMode = 'restaurants';
    this.selectedRestaurantId = null;
    this.selectedRestaurantName = '';
    this.products = [];
  }

  protected goToCheckout(): void {
    this.message = '';
    this.errorMessage = '';
    if (!this.cart.length) {
      this.errorMessage = 'Agrega al menos un producto antes de continuar al pago.';
      return;
    }
    this.viewMode = 'checkout';
  }

  protected returnToMenu(): void {
    this.message = '';
    this.errorMessage = '';
    this.viewMode = 'menu';
  }

  protected addToCart(product: Product): void {
    if (!this.selectedRestaurantId) return;

    const existing = this.cart.find((line) => line.productId === product.id);
    if (existing) {
      existing.quantity += 1;
      this.persistCart();
      return;
    }

    this.cart.push({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1
    });
    this.persistCart();
  }

  protected changeQty(productId: number, delta: number): void {
    const line = this.cart.find((item) => item.productId === productId);
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) {
      this.cart = this.cart.filter((item) => item.productId !== productId);
    }
    this.persistCart();
  }

  protected removeFromCart(productId: number): void {
    this.cart = this.cart.filter((item) => item.productId !== productId);
    this.persistCart();
  }

  protected clearCart(): void {
    this.cart = [];
    localStorage.removeItem(ClientDashboardPageComponent.CART_KEY);
  }

  protected async checkout(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';

    if (!this.selectedRestaurantId) {
      this.errorMessage = 'Selecciona un restaurante.';
      return;
    }
    if (!this.cart.length) {
      this.errorMessage = 'El carrito esta vacio.';
      return;
    }

    this.placingOrder = true;
    try {
      const order = await this.apiService.createOrder({
        restaurantId: this.selectedRestaurantId,
        deliveryAddress: this.deliveryAddress.trim(),
        paymentMethod: this.paymentMethod,
        items: this.cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        }))
      });

      this.message = `Pedido #${order.id} creado correctamente.`;
      this.clearCart();
      this.deliveryAddress = '';
      this.viewMode = 'menu';
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear el pedido.');
    } finally {
      this.placingOrder = false;
    }
  }

  protected async cancelOrder(orderId: number): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.cancellingOrderId = orderId;
    try {
      await this.apiService.cancelOrder(orderId);
      this.message = `Pedido #${orderId} cancelado.`;
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cancelar el pedido.');
    } finally {
      this.cancellingOrderId = null;
    }
  }

  protected canCancel(status: string): boolean {
    return ['PENDING', 'ACCEPTED'].includes(status);
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

  protected async loadOrders(): Promise<void> {
    this.loadingOrders = true;
    this.errorMessage = '';
    try {
      this.orders = await this.apiService.getMyOrders();
      if (!this.orders.find((order) => order.id === this.incidentOrderId)) {
        this.incidentOrderId = this.orders[0]?.id ?? null;
      }
      if (!this.incidentOrderId && this.orders.length > 0) {
        this.incidentOrderId = this.orders[0].id;
      }
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos.');
    } finally {
      this.loadingOrders = false;
    }
  }

  protected async loadIncidents(): Promise<void> {
    this.loadingIncidents = true;
    this.errorMessage = '';
    try {
      this.incidents = await this.apiService.getIncidents();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar incidencias.');
    } finally {
      this.loadingIncidents = false;
    }
  }

  protected async createIncident(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';

    if (!this.incidentOrderId) {
      this.errorMessage = 'Selecciona un pedido.';
      return;
    }

    const title = this.incidentTitle.trim();
    const description = this.incidentDescription.trim();

    if (title.length < 5) {
      this.errorMessage = 'El titulo debe tener al menos 5 caracteres.';
      return;
    }

    if (description.length < 10) {
      this.errorMessage = 'La descripcion debe tener al menos 10 caracteres.';
      return;
    }

    this.savingIncident = true;
    try {
      const incident = await this.apiService.createIncident({
        orderId: this.incidentOrderId,
        title,
        description
      });
      this.message = `Incidencia #${incident.id} creada.`;
      this.incidentTitle = '';
      this.incidentDescription = '';
      await this.loadIncidents();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear la incidencia.');
    } finally {
      this.savingIncident = false;
    }
  }

  private async boot(): Promise<void> {
    this.restoreCart();
    await Promise.all([this.loadRestaurants(), this.loadOrders(), this.loadIncidents()]);

    if (this.selectedRestaurantId) {
      const selected = this.restaurants.find((item) => item.id === this.selectedRestaurantId);
      if (selected) {
        this.selectedRestaurantName = selected.name;
        this.viewMode = 'menu';
        await this.loadProducts(selected.id);
      } else {
        this.selectedRestaurantId = null;
        this.selectedRestaurantName = '';
        this.products = [];
        this.clearCart();
      }
    }

    await this.connectEvents();
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

  private persistCart(): void {
    const payload = {
      restaurantId: this.selectedRestaurantId,
      lines: this.cart
    };
    localStorage.setItem(ClientDashboardPageComponent.CART_KEY, JSON.stringify(payload));
  }

  private restoreCart(): void {
    try {
      const raw = localStorage.getItem(ClientDashboardPageComponent.CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        restaurantId: number | null;
        lines: CartLine[];
      };
      if (!Array.isArray(parsed.lines)) return;
      this.selectedRestaurantId = parsed.restaurantId;
      this.cart = parsed.lines.filter(
        (line) =>
          Number.isFinite(line.productId) &&
          Number.isFinite(line.price) &&
          Number.isFinite(line.quantity)
      );
    } catch {
      this.clearCart();
    }
  }

  private async connectEvents(): Promise<void> {
    this.eventSource = await this.orderEventsService.connect({
      onConnected: () => {},
      onError: () => {},
      onOrderStatusChanged: (event: OrderStatusEvent) => {
        const found = this.orders.find((order) => order.id === event.orderId);
        if (found) {
          found.status = event.status;
        } else {
          void this.loadOrders();
        }
      }
    });
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
