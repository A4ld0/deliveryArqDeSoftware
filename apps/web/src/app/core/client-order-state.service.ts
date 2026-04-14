import { Injectable, computed, signal } from '@angular/core';
import type { Product } from './models';

interface CartLine {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface PersistedCart {
  restaurantId: number | null;
  restaurantName?: string;
  lines: CartLine[];
}

@Injectable({ providedIn: 'root' })
export class ClientOrderStateService {
  private static readonly CART_KEY = 'delivery.client.cart.v1';

  private readonly cartSignal = signal<CartLine[]>([]);
  private readonly selectedRestaurantIdSignal = signal<number | null>(null);
  private readonly selectedRestaurantNameSignal = signal('');

  readonly cart = computed(() => this.cartSignal());
  readonly selectedRestaurantId = computed(() => this.selectedRestaurantIdSignal());
  readonly selectedRestaurantName = computed(() => this.selectedRestaurantNameSignal());
  readonly cartSubtotal = computed(() =>
    this.cartSignal().reduce((sum, line) => sum + line.price * line.quantity, 0)
  );
  readonly cartItemsCount = computed(() =>
    this.cartSignal().reduce((sum, line) => sum + line.quantity, 0)
  );

  constructor() {
    this.restore();
  }

  setRestaurant(restaurantId: number, restaurantName: string): void {
    this.selectedRestaurantIdSignal.set(restaurantId);
    this.selectedRestaurantNameSignal.set(restaurantName);
    this.persist();
  }

  clearRestaurant(): void {
    this.selectedRestaurantIdSignal.set(null);
    this.selectedRestaurantNameSignal.set('');
    this.persist();
  }

  addProduct(product: Product): void {
    const existing = this.cartSignal().find((line) => line.productId === product.id);
    if (existing) {
      this.changeQty(product.id, 1);
      return;
    }

    const next = [
      ...this.cartSignal(),
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1
      }
    ];
    this.cartSignal.set(next);
    this.persist();
  }

  changeQty(productId: number, delta: number): void {
    const next = this.cartSignal()
      .map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: line.quantity + delta
            }
          : line
      )
      .filter((line) => line.quantity > 0);

    this.cartSignal.set(next);
    this.persist();
  }

  removeProduct(productId: number): void {
    this.cartSignal.set(this.cartSignal().filter((line) => line.productId !== productId));
    this.persist();
  }

  clearCart(): void {
    this.cartSignal.set([]);
    this.persist();
  }

  clearAll(): void {
    this.cartSignal.set([]);
    this.selectedRestaurantIdSignal.set(null);
    this.selectedRestaurantNameSignal.set('');
    localStorage.removeItem(ClientOrderStateService.CART_KEY);
  }

  private persist(): void {
    const payload: PersistedCart = {
      restaurantId: this.selectedRestaurantIdSignal(),
      restaurantName: this.selectedRestaurantNameSignal() || undefined,
      lines: this.cartSignal()
    };

    if (payload.lines.length === 0 && !payload.restaurantId) {
      localStorage.removeItem(ClientOrderStateService.CART_KEY);
      return;
    }

    localStorage.setItem(ClientOrderStateService.CART_KEY, JSON.stringify(payload));
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(ClientOrderStateService.CART_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PersistedCart;
      if (!Array.isArray(parsed.lines)) return;

      this.selectedRestaurantIdSignal.set(parsed.restaurantId ?? null);
      this.selectedRestaurantNameSignal.set(parsed.restaurantName ?? '');
      this.cartSignal.set(
        parsed.lines.filter(
          (line) =>
            Number.isFinite(line.productId) &&
            Number.isFinite(line.price) &&
            Number.isFinite(line.quantity)
        )
      );
    } catch {
      this.clearAll();
    }
  }
}
