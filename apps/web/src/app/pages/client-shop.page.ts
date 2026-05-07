import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import { SearchService } from '../core/search.service';
import { SessionService } from '../core/session.service';
import type { IncidentItem, OrderSummary, Product, Restaurant } from '../core/models';

const GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
  'linear-gradient(135deg, #4ECDC4 0%, #55E2D9 100%)',
  'linear-gradient(135deg, #45B7D1 0%, #59CBE8 100%)',
  'linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)',
];

@Component({
  selector: 'app-client-shop-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shop-container">
      
      <!-- ══ BROWSE VIEW (RESTAURANTS) ══ -->
      @if (view === 'browse') {
        <div class="browse-view anim-fade-in">
          
          @if (!isAuthenticated()) {
            <section class="shop-hero anim-slide-up">
              <div class="hero-content">
                <h1>Tus restaurantes favoritos, <span>a un clic.</span></h1>
                <p>La mejor comida de la ciudad entregada con amor y rapidez.</p>
                <div class="hero-actions">
                  <button class="primary-btn" (click)="scrollToGrid()">Explorar menú</button>
                  <a routerLink="/auth/login" class="secondary-btn">Iniciar sesión</a>
                </div>
              </div>
              <div class="hero-visual" aria-hidden="true">
                <div class="floating-badge">🍔 +100 Negocios</div>
                <div class="floating-badge second">🚀 Entrega Flash</div>
              </div>
            </section>
          }
          <header class="browse-header">
            <div class="browse-title">
              <h2>¿Qué se te antoja hoy?</h2>
              <p>Descubre los mejores sabores cerca de ti</p>
            </div>
            <div class="filter-actions">
              <div class="quick-filters" role="group" aria-label="Filtros rapidos de comida">
                @for (cat of ['Pizza', 'Burgers', 'Sushi', 'Tacos', 'Postres']; track cat) {
                  <button type="button" (click)="searchService.setQuery(cat)" [class.active]="searchService.query() === cat" [attr.aria-pressed]="searchService.query() === cat">{{ cat }}</button>
                }
              </div>
              @if (searchService.query()) {
                <button type="button" class="reset-btn" (click)="searchService.setQuery('')" aria-label="Limpiar filtro de busqueda">
                  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  Limpiar
                </button>
              }
            </div>
          </header>

          @if (loadingRestaurants) {
            <div class="skeleton-grid">
              @for (n of [1,2,3,4,5,6,7,8]; track n) { <div class="skeleton-card"></div> }
            </div>
          } @else {
            <div class="restaurant-grid">
              @for (r of filteredRestaurants; track r.id) {
                <button type="button" class="r-card" (click)="selectRestaurant(r)" [attr.aria-label]="'Seleccionar restaurante ' + r.name + '. Estado: ' + (r.is_open ? 'abierto' : 'cerrado')">
                  <div class="r-card__image" [style.background]="bannerGradient(r.id)">
                    <span>{{ r.name.charAt(0) }}</span>
                    <span class="status-chip" [class.open]="r.is_open">{{ r.is_open ? 'Abierto' : 'Cerrado' }}</span>
                  </div>
                  <div class="r-card__content">
                    <h3>{{ r.name }}</h3>
                    <p>{{ r.description || 'Deliciosa comida a domicilio' }}</p>
                    <div class="r-card__meta">
                      <span>⭐ 4.8</span>
                      <span>• 25-35 min</span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }
        </div>
      }

        <!-- ══ MENU VIEW (PRODUCTS) ══ -->
      @if (view === 'menu' && selectedRestaurant) {
        <div class="menu-view anim-fade-in">
          <div class="menu-main">
            <header class="menu-hero" [style.background]="bannerGradient(selectedRestaurant.id)">
              <button type="button" class="back-btn" (click)="goToBrowse()" aria-label="Volver a la lista de restaurantes">
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m15 18-6-6 6-6"/></svg>
                Volver
              </button>
              <div class="hero-content">
                <h1>{{ selectedRestaurant.name }}</h1>
                <p>{{ selectedRestaurant.description || 'Los mejores sabores en tu mesa' }}</p>
              </div>
            </header>

            <nav class="category-nav" aria-label="Categorias del menu">
              @for (cat of categories; track cat) {
                <button type="button" [class.active]="activeCategory === cat" [attr.aria-pressed]="activeCategory === cat" (click)="activeCategory = cat">{{ cat }}</button>
              }
            </nav>

            <div class="product-grid">
              @for (p of filteredProducts; track p.id) {
                <div class="product-card">
                  <div class="product-card__info">
                    <h3>{{ p.name }}</h3>
                    <p>{{ p.description }}</p>
                    <span class="price">\${{ asPrice(p.price) }}</span>
                    <button type="button" class="add-btn" (click)="addToCart(p)" [attr.aria-label]="'Agregar ' + p.name + ' al carrito'">
                      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                      Agregar
                    </button>
                  </div>
                  @if (p.image_url) {
                    <div class="product-card__img">
                      <img [src]="p.image_url" [alt]="p.name" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <aside class="cart-sidebar" [class.cart-sidebar--open]="isMobileCartOpen()" aria-label="Carrito de compra">
            <div id="cart-panel" class="cart-sidebar__sticky">
              <button type="button" class="cart-header" (click)="toggleMobileCart()" [attr.aria-expanded]="isMobileCartOpen()" aria-controls="cart-panel">
                <h3>Tu Pedido</h3>
                <span class="item-count">{{ cartItemsCount() }} items</span>
                <svg class="mobile-chevron" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m18 15-6-6-6 6"/></svg>
              </button>

              @if (!cart().length) {
                <div class="cart-empty">
                  <div class="empty-icon">🛒</div>
                  <p>Tu carrito está vacío</p>
                  <span>Agrega algunos productos para comenzar tu pedido.</span>
                </div>
              } @else {
                <div class="cart-items">
                  @for (item of cart(); track item.productId) {
                    <div class="cart-item">
                      <div class="cart-item__qty">
                        <button type="button" (click)="changeQty(item.productId, -1)" [attr.aria-label]="'Disminuir cantidad de ' + item.name">-</button>
                        <span [attr.aria-label]="'Cantidad: ' + item.quantity">{{ item.quantity }}</span>
                        <button type="button" (click)="changeQty(item.productId, 1)" [attr.aria-label]="'Aumentar cantidad de ' + item.name">+</button>
                      </div>
                      <div class="cart-item__info">
                        <strong>{{ item.name }}</strong>
                        <span>\${{ (item.price * item.quantity).toFixed(2) }}</span>
                      </div>
                      <button type="button" class="cart-item__remove" (click)="removeFromCart(item.productId)" [attr.aria-label]="'Eliminar ' + item.name + ' del carrito'">×</button>
                    </div>
                  }
                </div>

                <footer class="cart-footer">
                  <div class="cart-subtotal">
                    <span>Subtotal</span>
                    <strong>\${{ cartSubtotal().toFixed(2) }}</strong>
                  </div>
                  <button type="button" class="pay-btn" (click)="goToCheckout()" [attr.aria-label]="'Ir a pagar. Subtotal ' + cartSubtotal().toFixed(2)">
                    Ir a pagar
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                  </button>
                </footer>
              }
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .shop-container { padding-bottom: 4rem; }
    
    /* ── SHOP HERO ── */
    .shop-hero { background: var(--ink); color: white; padding: 4rem; border-radius: 40px; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 4rem; overflow: hidden; position: relative; }
    .hero-content h1 { font-size: 3.5rem; font-weight: 950; line-height: 1.1; margin: 0; letter-spacing: -0.04em; }
    .hero-content h1 span { color: var(--primary); }
    .hero-content p { font-size: 1.2rem; opacity: 0.8; margin: 1.5rem 0 2.5rem; line-height: 1.5; }
    .hero-actions { display: flex; gap: 1rem; }
    .hero-actions .primary-btn { background: var(--primary); color: white; padding: 1rem 2.5rem; border-radius: 99px; font-weight: 800; border: none; cursor: pointer; transition: all 0.3s; font-size: 1.1rem; }
    .hero-actions .primary-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(255,68,31,0.4); }
    .hero-actions .secondary-btn { border: 2px solid rgba(255,255,255,0.2); color: white; padding: 1rem 2.5rem; border-radius: 99px; font-weight: 800; text-decoration: none; transition: all 0.3s; font-size: 1.1rem; }
    .hero-actions .secondary-btn:hover { background: rgba(255,255,255,0.1); border-color: white; }

    .hero-visual { position: relative; height: 300px; background: rgba(255,255,255,0.05); border-radius: 30px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,0.1); }
    .floating-badge { position: absolute; background: white; color: var(--ink); padding: 0.8rem 1.5rem; border-radius: 20px; font-weight: 800; box-shadow: 0 15px 30px rgba(0,0,0,0.2); animation: float 4s ease-in-out infinite; top: 20%; right: -5%; }
    .floating-badge.second { animation-delay: 2s; top: 60%; left: -5%; }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

    /* ── BROWSE VIEW ── */
    .browse-view { display: grid; gap: 2.5rem; }
    .browse-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1.5rem; }
    .browse-title h2 { margin: 0; font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em; }
    .browse-title p { margin: 0.4rem 0 0; color: var(--muted); font-size: 1.05rem; font-weight: 500; }
    
    .filter-actions { display: flex; align-items: center; gap: 1rem; }
    .quick-filters { display: flex; gap: 0.8rem; }
    .quick-filters button { background: white; border: 1.5px solid var(--line); padding: 0.6rem 1.2rem; border-radius: 99px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
    .quick-filters button:hover { border-color: var(--primary); color: var(--primary); }
    .quick-filters button.active { background: var(--ink); color: white; border-color: var(--ink); }

    .reset-btn { display: flex; align-items: center; gap: 0.5rem; background: var(--primary-soft); color: var(--primary-strong); border: none; padding: 0.6rem 1.2rem; border-radius: 99px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: transform 0.2s; }
    .reset-btn svg { width: 14px; height: 14px; }
    .reset-btn:hover { transform: scale(1.05); }

    .restaurant-grid { display: grid; gap: 1.8rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .r-card { background: var(--panel); border: 1.5px solid var(--line); border-radius: 20px; overflow: hidden; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); border: none; padding: 0; text-align: left; }
    .r-card:hover { transform: translateY(-6px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
    .r-card__image { height: 160px; display: grid; place-items: center; font-size: 3rem; font-weight: 900; color: white; position: relative; }
    .status-chip { position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.6); padding: 4px 12px; border-radius: 99px; font-size: 0.75rem; color: white; font-weight: 700; backdrop-filter: blur(4px); }
    .status-chip.open { background: var(--primary); }
    .r-card__content { padding: 1.5rem; }
    .r-card__content h3 { margin: 0 0 0.5rem; font-size: 1.3rem; font-weight: 800; }
    .r-card__content p { margin: 0 0 1rem; color: var(--muted); font-size: 0.9rem; }
    .r-card__meta { display: flex; gap: 1rem; font-size: 0.85rem; font-weight: 700; color: var(--ink); }

    /* ── MENU VIEW ── */
    .menu-view { display: grid; grid-template-columns: 1fr 380px; gap: 2rem; align-items: flex-start; }
    .menu-main { display: grid; gap: 2rem; }
    .menu-hero { height: 240px; border-radius: 24px; padding: 2rem; display: flex; flex-direction: column; justify-content: flex-end; color: white; position: relative; overflow: hidden; }
    .menu-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.4)); }
    .hero-content { position: relative; z-index: 1; }
    .hero-content h1 { margin: 0; font-size: 2.8rem; font-weight: 900; }
    .hero-content p { margin: 0.5rem 0 0; font-weight: 500; opacity: 0.9; }
    .back-btn { position: absolute; top: 1.5rem; left: 1.5rem; background: rgba(255,255,255,0.2); border: none; padding: 8px 16px; border-radius: 99px; color: white; font-weight: 700; cursor: pointer; z-index: 2; backdrop-filter: blur(8px); }

    .category-nav { display: flex; gap: 1rem; position: sticky; top: 100px; background: var(--bg-app); padding: 1rem 0; z-index: 10; overflow-x: auto; scrollbar-width: none; }
    .category-nav button { background: none; border: none; font-size: 1rem; font-weight: 700; color: var(--muted); cursor: pointer; white-space: nowrap; padding: 4px 0; border-bottom: 2px solid transparent; }
    .category-nav button.active { color: var(--primary); border-bottom-color: var(--primary); }

    .product-grid { display: grid; gap: 1.5rem; }
    .product-card { display: flex; justify-content: space-between; padding: 1.5rem; background: var(--panel); border-radius: 18px; border: 1.5px solid var(--line); transition: border-color 0.2s; }
    .product-card:hover { border-color: var(--primary-mid); }
    .product-card__info { flex: 1; display: grid; gap: 0.5rem; }
    .product-card__info h3 { margin: 0; font-size: 1.15rem; font-weight: 800; }
    .product-card__info p { margin: 0; color: var(--muted); font-size: 0.88rem; line-height: 1.5; }
    .product-card__info .price { font-weight: 800; font-size: 1.1rem; color: var(--primary-strong); }
    .add-btn { background: var(--ink); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 99px; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; width: fit-content; transition: transform 0.2s; }
    .add-btn:hover { transform: scale(1.05); }
    .product-card__img img { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; margin-left: 1.5rem; }

    /* ── CART SIDEBAR ── */
    .cart-sidebar { position: sticky; top: 100px; }
    .cart-sidebar__sticky { background: var(--panel); border: 1.5px solid var(--line); border-radius: 24px; padding: 2rem; display: flex; flex-direction: column; min-height: 400px; box-shadow: var(--shadow-sm); }
    .cart-header { width: 100%; display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2rem; padding: 0 0 1rem; border: 0; border-bottom: 1.5px solid var(--line); background: transparent; color: inherit; text-align: left; font: inherit; }
    .cart-header h3 { margin: 0; font-size: 1.3rem; font-weight: 900; }
    .item-count { font-weight: 700; color: var(--muted); font-size: 0.85rem; }

    .cart-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--muted); }
    .empty-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; }
    .cart-empty p { margin: 0 0 0.4rem; font-weight: 800; color: var(--ink); }
    .cart-empty span { font-size: 0.85rem; }

    .cart-items { flex: 1; display: grid; gap: 1.2rem; align-content: start; }
    .cart-item { display: flex; gap: 1rem; align-items: center; }
    .cart-item__qty { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--surface-alt); padding: 4px; border-radius: 99px; width: 32px; }
    .cart-item__qty button { background: none; border: none; font-weight: 900; cursor: pointer; color: var(--muted); padding: 2px 8px; }
    .cart-item__qty span { font-weight: 800; font-size: 0.85rem; }
    .cart-item__info { flex: 1; display: flex; flex-direction: column; }
    .cart-item__info strong { font-size: 0.95rem; }
    .cart-item__info span { font-size: 0.85rem; font-weight: 700; color: var(--primary-strong); }
    .cart-item__remove { background: none; border: none; font-size: 1.4rem; color: var(--muted); cursor: pointer; padding: 4px; line-height: 1; }

    .cart-footer { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1.5px dashed var(--line); display: grid; gap: 1.5rem; }
    .cart-subtotal { display: flex; justify-content: space-between; font-size: 1.15rem; }
    .pay-btn { background: var(--primary); color: white; border: none; padding: 1.2rem; border-radius: 99px; font-weight: 900; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 0.8rem; cursor: pointer; transition: transform 0.2s; box-shadow: 0 8px 16px rgba(255,68,31,0.25); }
    .pay-btn:hover { transform: translateY(-2px); }

    .anim-fade-in { animation: fadeIn 0.4s ease-out; }
    .anim-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .mobile-chevron { display: none; width: 24px; height: 24px; color: var(--muted); }
    @media (max-width: 1100px) {
      .mobile-chevron { display: block; transition: transform 0.3s; }
      .cart-sidebar--open .mobile-chevron { transform: rotate(180deg); }
      .menu-view { grid-template-columns: 1fr; }
      .cart-sidebar { 
        position: fixed; 
        bottom: 0; 
        left: 0; 
        right: 0; 
        top: auto; 
        z-index: 1000;
        background: white;
        box-shadow: 0 -10px 30px rgba(0,0,0,0.1);
        border-radius: 24px 24px 0 0;
        padding: 1rem;
        transform: translateY(calc(100% - 70px));
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cart-sidebar--open { transform: translateY(0); }
      .cart-header { padding: 0.5rem 1rem; cursor: pointer; }
    }

    @media (max-width: 900px) {
      .shop-hero { grid-template-columns: 1fr; padding: 2rem; gap: 2rem; }
      .hero-content h1 { font-size: 2.2rem; }
      .hero-visual { height: 200px; }
      .hero-actions { flex-direction: column; }
    }
  `
})
export class ClientShopPageComponent {
  private readonly apiService = inject(ApiService);
  private readonly orderState = inject(ClientOrderStateService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  protected readonly searchService = inject(SearchService);

  protected readonly isAuthenticated = this.sessionService.isAuthenticated;
  protected readonly cart = this.orderState.cart;
  protected readonly cartSubtotal = this.orderState.cartSubtotal;
  protected readonly cartItemsCount = this.orderState.cartItemsCount;
  protected readonly selectedRestaurantId = this.orderState.selectedRestaurantId;
  protected readonly defaultProductImage = 'assets/placeholder-food.svg';

  protected view: 'browse' | 'menu' = 'browse';
  protected restaurants: Restaurant[] = [];
  protected products: Product[] = [];
  protected selectedRestaurant: Restaurant | null = null;
  protected activeCategory = 'Todos';

  protected loadingRestaurants = false;
  protected loadingProducts = false;

  protected readonly isMobileCartOpen = signal(false);

  constructor() {
    this.boot();
  }

  protected scrollToGrid() {
    document.querySelector('.browse-header')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected get filteredRestaurants(): Restaurant[] {
    const q = this.searchService.query().trim().toLowerCase();
    if (!q) return this.restaurants;
    return this.restaurants.filter(r => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
  }

  protected get categories(): string[] {
    const cats = this.products.map(p => p.category).filter((c): c is string => Boolean(c));
    return ['Todos', ...Array.from(new Set(cats))];
  }

  protected get filteredProducts(): Product[] {
    if (this.activeCategory === 'Todos') return this.products;
    return this.products.filter(p => p.category === this.activeCategory);
  }

  protected async selectRestaurant(restaurant: Restaurant): Promise<void> {
    if (this.selectedRestaurantId() && this.selectedRestaurantId() !== restaurant.id && this.cart().length > 0) {
      const confirmed = window.confirm('¿Cambiar de restaurante? Se vaciará el carrito.');
      if (!confirmed) return;
      this.orderState.clearCart();
    }

    this.orderState.setRestaurant(restaurant.id, restaurant.name);
    this.selectedRestaurant = restaurant;
    this.view = 'menu';
    await this.loadProducts(restaurant.id);
  }

  protected goToBrowse(): void {
    this.view = 'browse';
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

  protected toggleMobileCart(): void {
    if (window.innerWidth <= 1100) {
      this.isMobileCartOpen.update((v: boolean) => !v);
    }
  }

  protected goToCheckout(): void {
    void this.router.navigateByUrl('/checkout');
  }

  protected bannerGradient(id: number): string {
    return GRADIENTS[id % GRADIENTS.length];
  }

  protected asPrice(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  private async boot(): Promise<void> {
    this.loadingRestaurants = true;
    try {
      this.restaurants = await this.apiService.getRestaurants();
      // Siempre empezar en browse, no auto-seleccionar para que vea todos los negocios
      this.view = 'browse';
    } finally {
      this.loadingRestaurants = false;
    }
  }

  private async loadProducts(restaurantId: number): Promise<void> {
    this.loadingProducts = true;
    try {
      this.products = await this.apiService.getProductsByRestaurant(restaurantId);
    } finally {
      this.loadingProducts = false;
    }
  }
}
