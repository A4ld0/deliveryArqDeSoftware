import { TestBed } from '@angular/core/testing';
import { ClientOrderStateService } from './client-order-state.service';
import type { Product } from './models';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    restaurant_id: 10,
    name: 'Taco de prueba',
    description: 'Producto para pruebas',
    price: 50,
    category: 'Tacos',
    image_url: null,
    available: true,
    created_at: '2026-05-06T00:00:00.000Z',
    ...overrides
  };
}

describe('ClientOrderStateService', () => {
  let service: ClientOrderStateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ClientOrderStateService]
    });
    service = TestBed.inject(ClientOrderStateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart and no selected restaurant', () => {
    expect(service.cart()).toEqual([]);
    expect(service.selectedRestaurantId()).toBeNull();
    expect(service.cartSubtotal()).toBe(0);
    expect(service.cartItemsCount()).toBe(0);
  });

  it('adds products and calculates totals', () => {
    service.setRestaurant(10, 'Tacos Norte 24');
    service.addProduct(product({ id: 1, name: 'Taco', price: 40 }));
    service.addProduct(product({ id: 2, name: 'Burrito', price: '120.50' }));

    expect(service.selectedRestaurantId()).toBe(10);
    expect(service.selectedRestaurantName()).toBe('Tacos Norte 24');
    expect(service.cartItemsCount()).toBe(2);
    expect(service.cartSubtotal()).toBe(160.5);
  });

  it('increments existing products and removes them when quantity reaches zero', () => {
    service.addProduct(product({ id: 1, price: 30 }));
    service.addProduct(product({ id: 1, price: 30 }));

    expect(service.cart()[0].quantity).toBe(2);
    expect(service.cartSubtotal()).toBe(60);

    service.changeQty(1, -1);
    expect(service.cart()[0].quantity).toBe(1);

    service.changeQty(1, -1);
    expect(service.cart()).toEqual([]);
  });

  it('persists and restores the selected restaurant and cart', () => {
    service.setRestaurant(20, 'Sushi N Go');
    service.addProduct(product({ id: 7, name: 'Sushi roll', price: 99 }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ClientOrderStateService]
    });
    const restored = TestBed.inject(ClientOrderStateService);

    expect(restored.selectedRestaurantId()).toBe(20);
    expect(restored.selectedRestaurantName()).toBe('Sushi N Go');
    expect(restored.cart()).toEqual([
      jasmine.objectContaining({
        productId: 7,
        name: 'Sushi roll',
        price: 99,
        quantity: 1
      })
    ]);
  });

  it('clearAll removes every cart value from state and local storage', () => {
    service.setRestaurant(10, 'Tacos Norte 24');
    service.addProduct(product());

    service.clearAll();

    expect(service.selectedRestaurantId()).toBeNull();
    expect(service.selectedRestaurantName()).toBe('');
    expect(service.cart()).toEqual([]);
    expect(localStorage.getItem('delivery.client.cart.v1')).toBeNull();
  });
});
