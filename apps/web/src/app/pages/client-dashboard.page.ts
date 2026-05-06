import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderMapComponent } from '../components/order-map.component';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationPickerComponent } from '../components/location-picker.component';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import { ProfileService } from '../core/profile.service';
import type {
  IncidentItem,
  OrderStatusEvent,
  OrderSummary,
  Product,
  Restaurant
} from '../core/models';
import { OrderEventsService } from '../core/order-events.service';

type ViewMode = 'restaurants' | 'menu' | 'checkout';

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent, OrderMapComponent],
  template: `
    <section class="dashboard">
      <header class="dashboard__header">
        <div class="welcome">
          <h2>¡Hola, {{ (profile()?.fullName ?? '').split(' ')[0] || 'Gourmet' }}! 🍕</h2>
          <p>¿Qué vamos a pedir hoy?</p>
        </div>

        <div class="quick-actions">
          <!-- Botón de perfil removido aquí, ya está en el header -->
        </div>
      </header>

      <!-- STEP 1: RESTAURANTS -->
      <article class="card main-card">
        <header class="card-header">
          <div class="step-badge">1</div>
          <h3>Elige tu restaurante</h3>
          <button type="button" class="refresh-btn" (click)="loadRestaurants()" [disabled]="loadingRestaurants">
             <svg [class.spin]="loadingRestaurants" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </header>

        @if (loadingRestaurants) {
          <div class="skeleton-grid">
            @for (n of [1,2,3,4]; track n) { <div class="skeleton-item"></div> }
          </div>
        } @else if (!restaurants.length) {
          <div class="empty-state">No hay restaurantes disponibles.</div>
        } @else {
          <div class="restaurant-grid">
            @for (r of restaurants; track r.id) {
              <button
                type="button"
                class="r-card"
                [class.active]="r.id === selectedRestaurantId()"
                (click)="selectRestaurant(r)"
              >
                <div class="r-card__banner" [style.background]="bannerGradient(r.id)">
                   <span>{{ r.name.charAt(0) }}</span>
                </div>
                <div class="r-card__info">
                  <strong>{{ r.name }}</strong>
                  <span class="status" [class.open]="r.is_open">{{ r.is_open ? '● Abierto' : '● Cerrado' }}</span>
                </div>
              </button>
            }
          </div>
        }
      </article>

      <!-- STEP 2: MENU -->
      @if (selectedRestaurantId()) {
        <article class="card main-card anim-slide-up">
          <header class="card-header">
            <div class="step-badge">2</div>
            <h3>{{ viewMode === 'checkout' ? 'Revisa tu pedido' : 'Selecciona tus platillos' }}</h3>
            <div class="header-actions">
              <button type="button" class="ghost-btn" (click)="backToRestaurants()">Cambiar restaurante</button>
              @if (viewMode === 'checkout') {
                <button type="button" class="ghost-btn" (click)="returnToMenu()">Volver al menú</button>
              }
            </div>
          </header>

          <p class="restaurant-label">📍 {{ selectedRestaurantName() }}</p>

          @if (viewMode === 'menu') {
            @if (loadingProducts) {
              <div class="skeleton-list"></div>
            } @else if (!products.length) {
              <div class="empty-state">Este restaurante aún no tiene productos.</div>
            } @else {
              <div class="catalog-grid">
                @for (p of products; track p.id) {
                  <div class="product-item">
                    <img [src]="p.image_url || defaultProductImage" [alt]="p.name" />
                    <div class="product-item__details">
                      <strong>{{ p.name }}</strong>
                      <span class="price">\${{ asPrice(p.price) }}</span>
                      <button type="button" class="add-btn" (click)="addToCart(p)">Agregar</button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="floating-summary" [class.visible]="cart().length > 0">
               <div class="summary-info">
                 <strong>{{ cartItemsCount() }} items</strong>
                 <span>Total: \${{ cartSubtotal().toFixed(2) }}</span>
               </div>
               <button type="button" class="checkout-btn" (click)="goToCheckout()">Proceder al pago</button>
            </div>
          }

          @if (viewMode === 'checkout') {
            <form (submit)="checkout($event)" class="checkout-view">
              <ul class="cart-list">
                @for (item of cart(); track item.productId) {
                  <li class="cart-item">
                    <div class="item-main">
                      <strong>{{ item.name }}</strong>
                      <span>\${{ item.price.toFixed(2) }}</span>
                    </div>
                    <div class="item-controls">
                      <button type="button" (click)="changeQty(item.productId, -1)">-</button>
                      <span>{{ item.quantity }}</span>
                      <button type="button" (click)="changeQty(item.productId, 1)">+</button>
                      <button type="button" class="remove" (click)="removeFromCart(item.productId)">Eliminar</button>
                    </div>
                  </li>
                }
              </ul>

              <div class="checkout-footer">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>\${{ cartSubtotal().toFixed(2) }}</span>
                </div>

                <div class="form-group tip-section">
                  <label>Agregar Propina para el Repartidor</label>
                  <div class="tip-options">
                    @for (amount of [10, 20, 50, 100]; track amount) {
                      <button type="button" class="tip-btn" [class.active]="tipAmount === amount" (click)="tipAmount = amount">
                        \${{ amount }}
                      </button>
                    }
                    <input type="number" [(ngModel)]="tipAmount" name="customTip" placeholder="Otro" />
                  </div>
                </div>

                <div class="total-row total-row--final">
                  <span>Total Final:</span>
                  <strong>\${{ (cartSubtotal() + tipAmount).toFixed(2) }}</strong>
                </div>

                <div class="checkout-grid">
                  <div class="checkout-details">
                    <div class="form-group">
                      <label>Dirección / Referencia de Entrega</label>
                      <input type="text" [(ngModel)]="deliveryAddress" name="deliveryAddress" placeholder="Ej: Calle 123, Casa azul, Portón blanco" required />
                    </div>
                    <div class="form-group">
                      <label>Método de Pago</label>
                      <select [(ngModel)]="paymentMethod" name="paymentMethod">
                        <option value="SIMULATED_CARD">💳 Tarjeta (Simulado)</option>
                        <option value="SIMULATED_CASH">💵 Efectivo (Simulado)</option>
                      </select>
                    </div>
                    <div class="form-actions">
                      <button type="submit" class="btn-primary-auth" [disabled]="placingOrder">
                        {{ placingOrder ? 'Procesando...' : 'Confirmar y Pagar Pedido' }}
                      </button>
                      <button type="button" class="ghost-btn" (click)="clearCart()">Vaciar Carrito</button>
                    </div>
                  </div>

                  <div class="checkout-location">
                    <label>Ajusta el Pin de Entrega</label>
                    <app-location-picker 
                      [lat]="deliveryLat" 
                      [lng]="deliveryLng" 
                      (locationChange)="onLocationChange($event)"
                    ></app-location-picker>
                  </div>
                </div>
              </div>
            </form>
          }
        </article>
      }

      <!-- ORDERS & SUPPORT -->
      <div class="dashboard__secondary">
        <article class="card">
          <header class="card-header">
            <h3>Mis Pedidos</h3>
            <button class="refresh-btn" (click)="loadOrders()" [disabled]="loadingOrders">
              <svg [class.spin]="loadingOrders" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </header>
          
          <div class="order-list">
            @if (loadingOrders) { <div class="skeleton-list"></div> }
            @else if (!orders.length) { <div class="empty-state">No hay pedidos aún.</div> }
            @else {
              @for (o of orders; track o.id) {
                <div class="order-card">
                  <div class="order-card__header">
                    <strong>#{{ o.id }}</strong>
                    <span class="status-badge" [class]="'status-' + o.status.toLowerCase()">{{ o.status }}</span>
                  </div>
                  <div class="order-card__footer">
                    <span>Total: \${{ o.total }}</span>
                    @if (canCancel(o.status)) {
                      <button (click)="cancelOrder(o.id)" [disabled]="cancellingOrderId === o.id">Cancelar</button>
                    }
                  </div>

                  @if (['ACCEPTED', 'READY_FOR_PICKUP', 'ASSIGNED', 'IN_TRANSIT'].includes(o.status.toUpperCase())) {
                    <div class="active-tracking">
                      <header class="tracking-header">
                        <span class="pulse-dot"></span>
                        <strong>Sigue tu pedido en tiempo real</strong>
                      </header>
                      <app-order-map
                        height="300px"
                        [driverLat]="o.driver_latitude"
                        [driverLng]="o.driver_longitude"
                        [restaurantLat]="o.restaurant_latitude"
                        [restaurantLng]="o.restaurant_longitude"
                        [deliveryLat]="o.delivery_latitude"
                        [deliveryLng]="o.delivery_longitude"
                      ></app-order-map>
                    </div>
                  }
                </div>
              }
            }
          </div>
        </article>

        <article class="card">
          <header class="card-header">
            <h3>Soporte</h3>
            <button class="refresh-btn" (click)="loadIncidents()" [disabled]="loadingIncidents">
              <svg [class.spin]="loadingIncidents" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </header>

          <form class="incident-form" (submit)="createIncident($event)">
            <select name="incidentOrderId" [(ngModel)]="incidentOrderId" required>
              <option [ngValue]="null" disabled selected>Selecciona un pedido</option>
              @for (o of orders; track o.id) {
                <option [ngValue]="o.id">Pedido #{{ o.id }}</option>
              }
            </select>
            <input type="text" placeholder="Título del problema" [(ngModel)]="incidentTitle" name="title" required />
            <textarea placeholder="Describe lo que pasó..." [(ngModel)]="incidentDescription" name="desc" required></textarea>
            <button type="submit" [disabled]="savingIncident">Reportar Incidencia</button>
          </form>

          <div class="incident-list">
             @for (inc of incidents; track inc.id) {
               <div class="incident-item">
                 <strong>{{ inc.title }}</strong>
                 <p>{{ inc.description }}</p>
                 <span class="status">{{ inc.status }}</span>
               </div>
             }
          </div>
        </article>
      </div>

      @if (message) { <div class="toast success">{{ message }}</div> }
      @if (errorMessage) { <div class="toast error">{{ errorMessage }}</div> }
    </section>
  `,
  styles: `
    .dashboard { display: grid; gap: var(--space-4); padding: var(--space-4); max-width: 1200px; margin: 0 auto; }
    
    .dashboard__header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .welcome h2 { margin: 0; font-size: 1.8rem; font-weight: 800; }
    .welcome p { margin: 0.2rem 0 0; color: var(--muted); font-size: 1rem; }

    .action-btn {
      display: flex; align-items: center; gap: 0.5rem; background: var(--panel); border: 1.5px solid var(--line); padding: 0.6rem 1.2rem; border-radius: 99px; text-decoration: none; color: var(--ink); font-weight: 700; font-size: 0.9rem; transition: all 0.2s;
    }
    .action-btn:hover { border-color: var(--primary); background: var(--primary-soft); transform: translateY(-2px); }
    .action-btn svg { width: 1rem; height: 1rem; }

    .card { background: var(--panel); border: 1.5px solid var(--line); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: var(--shadow-xs); }
    .card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .step-badge { width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: grid; place-items: center; font-weight: 900; }
    .card-header h3 { margin: 0; flex: 1; font-weight: 800; }

    .refresh-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 50%; }
    .refresh-btn:hover { background: var(--surface-alt); color: var(--ink); }
    .refresh-btn svg { width: 1.2rem; height: 1.2rem; }
    .refresh-btn svg.spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* STEP 1 Grid */
    .restaurant-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
    .r-card {
      display: flex; flex-direction: column; padding: 0; border: 1.5px solid var(--line); border-radius: var(--radius-md); background: var(--surface); cursor: pointer; transition: all 0.2s; overflow: hidden; text-align: left;
    }
    .r-card:hover { border-color: var(--primary-mid); transform: translateY(-3px); box-shadow: var(--shadow-sm); }
    .r-card.active { border-color: var(--primary); background: var(--primary-soft); }
    .r-card__banner { height: 60px; display: grid; place-items: center; font-size: 1.5rem; font-weight: 900; color: white; opacity: 0.8; }
    .r-card__info { padding: 0.8rem; display: grid; gap: 0.2rem; }
    .r-card__info strong { font-size: 1rem; }
    .status { font-size: 0.75rem; font-weight: 700; color: var(--muted); }
    .status.open { color: var(--success); }

    /* STEP 2 Menu */
    .restaurant-label { margin: -1rem 0 1.5rem; font-weight: 700; color: var(--muted); }
    .catalog-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
    .product-item { display: flex; gap: 1rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 0.8rem; align-items: center; }
    .product-item img { width: 80px; height: 80px; border-radius: 12px; object-fit: cover; }
    .product-item__details { display: grid; gap: 0.2rem; flex: 1; }
    .product-item__details strong { font-size: 0.95rem; }
    .price { font-weight: 800; color: var(--primary-strong); }
    .add-btn { background: var(--ink); color: white; border: none; padding: 4px 12px; border-radius: 99px; font-size: 0.8rem; font-weight: 700; cursor: pointer; width: fit-content; }

    .floating-summary {
       position: sticky; bottom: 1rem; background: var(--ink); color: white; padding: 1rem 1.5rem; border-radius: 99px; display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; transform: translateY(100px); opacity: 0; transition: all 0.3s;
    }
    .floating-summary.visible { transform: translateY(0); opacity: 1; }
    .checkout-btn { background: var(--primary); border: none; color: white; padding: 0.6rem 1.2rem; border-radius: 99px; font-weight: 800; cursor: pointer; }

    /* Checkout */
    .cart-list { list-style: none; padding: 0; display: grid; gap: 0.8rem; }
    .cart-item { display: flex; justify-content: space-between; padding: 1rem; background: var(--surface-alt); border-radius: 12px; }
    .item-controls { display: flex; align-items: center; gap: 0.8rem; }
    .item-controls button { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--line); background: white; cursor: pointer; }
    .item-controls .remove { border: none; color: var(--danger); background: transparent; font-weight: 700; width: auto; font-size: 0.85rem; }

    .checkout-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1.5px dashed var(--line); }
    .total-row { display: flex; justify-content: space-between; font-size: 1.2rem; margin-bottom: 2rem; }
    .checkout-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 3rem; margin-top: 2rem; }
    @media (max-width: 900px) { .checkout-grid { grid-template-columns: 1fr; } }
    
    .checkout-details { display: grid; gap: 1.8rem; }
    .checkout-location { display: grid; gap: 0.8rem; }
    .checkout-location label { font-weight: 800; font-size: 0.85rem; text-transform: uppercase; color: var(--muted); }

    .form-group input, .form-group select { padding: 1rem 1.2rem; border-radius: 16px; border: 2px solid var(--line); background: var(--bg-app); font-family: inherit; font-weight: 600; font-size: 1rem; }
    .form-group input:focus { border-color: var(--primary); background: white; outline: none; }
    
    .active-tracking { margin-top: 1.5rem; border: 2px solid var(--primary-soft); border-radius: 24px; overflow: hidden; background: white; }
    .tracking-header { padding: 1rem 1.5rem; background: var(--primary-soft); display: flex; align-items: center; gap: 0.8rem; }
    .tracking-header strong { font-size: 0.9rem; color: var(--primary-strong); font-weight: 850; }
    .pulse-dot { width: 10px; height: 10px; background: var(--primary); border-radius: 50%; animation: pulse-anim 1.5s infinite; }
    @keyframes pulse-anim { 0% { transform: scale(0.8); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.8; } }

    .tip-section { margin-top: 1rem; }
    .tip-options { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .tip-btn { padding: 0.5rem 1rem; border-radius: 99px; border: 1.5px solid var(--line); background: white; font-weight: 700; cursor: pointer; transition: 0.2s; }
    .tip-btn.active { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-strong); }
    .tip-options input { width: 100px; padding: 0.4rem 0.8rem; }
    
    .total-row--final { border-top: 2px solid var(--line); padding-top: 1rem; margin-top: 0.5rem; color: var(--primary-strong); }

    /* Secondary sections */
    .dashboard__secondary { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .order-list, .incident-list { display: grid; gap: 0.8rem; margin-top: 1rem; }
    .order-card { padding: 1rem; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
    .order-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .status-badge { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; padding: 2px 8px; border-radius: 99px; background: #eee; }
    .status-delivered { background: var(--success-soft); color: var(--success); }
    .status-pending { background: #fff8e1; color: #ff8f00; }

    .incident-form { display: grid; gap: 0.8rem; margin-bottom: 1.5rem; }
    .incident-form button { background: var(--ink); color: white; border: none; padding: 0.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
    .incident-item { padding: 1rem; border-radius: 12px; background: var(--surface-alt); border-left: 4px solid var(--danger); }

    .anim-slide-up { animation: slideUp 0.4s ease-out; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 2rem; border-radius: 12px; color: white; font-weight: 800; animation: slideUp 0.3s; z-index: 1000; }
    .toast.success { background: var(--ink); }
    .toast.error { background: var(--danger); }
  `
})
export class ClientDashboardPageComponent implements OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly orderState = inject(ClientOrderStateService);
  private readonly orderEventsService = inject(OrderEventsService);
  private readonly profileService = inject(ProfileService);

  protected readonly defaultProductImage = 'assets/placeholder-food.svg';
  protected readonly cart = this.orderState.cart;
  protected readonly cartSubtotal = this.orderState.cartSubtotal;
  protected readonly cartItemsCount = this.orderState.cartItemsCount;
  protected readonly selectedRestaurantId = this.orderState.selectedRestaurantId;
  protected readonly selectedRestaurantName = this.orderState.selectedRestaurantName;
  protected readonly profile = this.profileService.profile;

  protected viewMode: ViewMode = 'restaurants';
  protected restaurants: Restaurant[] = [];
  protected products: Product[] = [];

  protected deliveryAddress = '';
  protected deliveryLat = 20.6597;
  protected deliveryLng = -103.3496;
  protected tipAmount = 0;
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

  constructor() {
    void this.boot();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  protected asPrice(value: number | string): string {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  protected bannerGradient(id: number): string {
    const gradients = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      'linear-gradient(135deg, #4ECDC4 0%, #55E2D9 100%)',
      'linear-gradient(135deg, #45B7D1 0%, #59CBE8 100%)',
      'linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)'
    ];
    return gradients[id % gradients.length];
  }

  protected async selectRestaurant(restaurant: Restaurant): Promise<void> {
    this.message = '';
    this.errorMessage = '';

    if (
      this.selectedRestaurantId() &&
      this.selectedRestaurantId() !== restaurant.id &&
      this.cart().length > 0
    ) {
      const confirmed = window.confirm(
        'Si cambias de restaurante se vaciará el carrito actual. ¿Deseas continuar?'
      );
      if (!confirmed) return;
      this.orderState.clearCart();
    }

    this.orderState.setRestaurant(restaurant.id, restaurant.name);
    this.viewMode = 'menu';
    await this.loadProducts(restaurant.id);
  }

  protected backToRestaurants(): void {
    this.message = '';
    this.errorMessage = '';
    this.viewMode = 'restaurants';
    this.orderState.clearRestaurant();
  }

  protected goToCheckout(): void {
    this.message = '';
    this.errorMessage = '';
    if (!this.cart().length) {
      this.errorMessage = 'Agrega al menos un producto.';
      return;
    }
    this.viewMode = 'checkout';
  }

  protected returnToMenu(): void {
    this.viewMode = 'menu';
  }

  protected addToCart(product: Product): void {
    this.orderState.addProduct(product);
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

  protected onLocationChange(loc: { lat: number; lng: number }): void {
    this.deliveryLat = loc.lat;
    this.deliveryLng = loc.lng;
  }

  protected async checkout(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';

    const restaurantId = this.selectedRestaurantId();
    if (!restaurantId) return;

    this.placingOrder = true;
    try {
      const order = await this.apiService.createOrder({
        restaurantId,
        deliveryAddress: this.deliveryAddress.trim(),
        deliveryLatitude: this.deliveryLat,
        deliveryLongitude: this.deliveryLng,
        tipAmount: this.tipAmount,
        paymentMethod: this.paymentMethod,
        items: this.cart().map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        }))
      });

      this.message = `¡Pedido #${order.id} creado con éxito!`;
      this.orderState.clearCart();
      this.deliveryAddress = '';
      this.tipAmount = 0;
      this.viewMode = 'restaurants';
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear el pedido.');
    } finally {
      this.placingOrder = false;
    }
  }

  protected async cancelOrder(orderId: number): Promise<void> {
    this.cancellingOrderId = orderId;
    try {
      await this.apiService.cancelOrder(orderId);
      this.message = `Pedido #${orderId} cancelado.`;
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'Error al cancelar.');
    } finally {
      this.cancellingOrderId = null;
    }
  }

  protected canCancel(status: string): boolean {
    return ['PENDING', 'ACCEPTED'].includes(status);
  }

  protected async loadRestaurants(): Promise<void> {
    this.loadingRestaurants = true;
    try {
      this.restaurants = await this.apiService.getRestaurants();
    } catch (error) {
      this.errorMessage = 'Error al cargar restaurantes.';
    } finally {
      this.loadingRestaurants = false;
    }
  }

  protected async loadOrders(): Promise<void> {
    this.loadingOrders = true;
    try {
      this.orders = await this.apiService.getMyOrders();
    } catch (error) {
      this.errorMessage = 'Error al cargar pedidos.';
    } finally {
      this.loadingOrders = false;
    }
  }

  protected async loadIncidents(): Promise<void> {
    this.loadingIncidents = true;
    try {
      this.incidents = await this.apiService.getIncidents();
    } catch (error) {
      this.errorMessage = 'Error al cargar incidencias.';
    } finally {
      this.loadingIncidents = false;
    }
  }

  protected async createIncident(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.incidentOrderId) return;

    this.savingIncident = true;
    try {
      const incident = await this.apiService.createIncident({
        orderId: this.incidentOrderId,
        title: this.incidentTitle.trim(),
        description: this.incidentDescription.trim()
      });
      this.message = `Incidencia #${incident.id} enviada.`;
      this.incidentTitle = '';
      this.incidentDescription = '';
      await this.loadIncidents();
    } catch (error) {
      this.errorMessage = 'Error al enviar incidencia.';
    } finally {
      this.savingIncident = false;
    }
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadRestaurants(), this.loadOrders(), this.loadIncidents()]);
    
    // Set default delivery location from profile if available
    const profile = this.profile();
    if (profile?.latitude && profile?.longitude) {
      this.deliveryLat = profile.latitude;
      this.deliveryLng = profile.longitude;
    }
    if (profile?.address) {
      this.deliveryAddress = profile.address;
    }

    if (this.selectedRestaurantId()) {
      this.viewMode = 'menu';
      await this.loadProducts(this.selectedRestaurantId()!);
    }

    await this.connectEvents();
  }

  private async loadProducts(restaurantId: number): Promise<void> {
    this.loadingProducts = true;
    try {
      this.products = await this.apiService.getProductsByRestaurant(restaurantId);
    } finally {
      this.loadingProducts = false;
    }
  }

  private async connectEvents(): Promise<void> {
    this.eventSource = await this.orderEventsService.connect({
      onConnected: () => {},
      onError: () => {},
      onOrderStatusChanged: (event: OrderStatusEvent) => {
        void this.loadOrders();
      }
    });
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return (error.error as any)?.error || fallback;
    }
    return fallback;
  }
}
