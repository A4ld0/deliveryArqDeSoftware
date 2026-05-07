import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { OrderSummary, OwnedRestaurant, Product } from '../core/models';
import { RestaurantDashboardPageComponent } from './restaurant-dashboard.page';

describe('RestaurantDashboardPageComponent', () => {
  let fixture: ComponentFixture<RestaurantDashboardPageComponent>;
  let component: RestaurantDashboardPageComponent;
  let apiService: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'getMyRestaurant',
      'getMyRestaurantProducts',
      'getMyOrders',
      'getOrderItems',
      'upsertMyRestaurant',
      'createMyRestaurantProduct',
      'updateMyRestaurantProduct',
      'deleteMyRestaurantProduct',
      'updateOrderStatus'
    ]);

    apiService.getMyRestaurant.and.resolveTo(ownedRestaurant());
    apiService.getMyRestaurantProducts.and.resolveTo([menuProduct()]);
    apiService.getMyOrders.and.resolveTo([orderSummary({ id: 1, status: 'PENDING' })]);
    apiService.getOrderItems.and.resolveTo([
      {
        id: 1,
        product_id: 7,
        quantity: 2,
        unit_price: '50.00',
        line_total: '100.00',
        product_name: 'Taco'
      }
    ]);
    apiService.upsertMyRestaurant.and.resolveTo(ownedRestaurant({ name: 'Nuevo negocio' }));
    apiService.createMyRestaurantProduct.and.resolveTo(menuProduct({ id: 8 }));
    apiService.updateMyRestaurantProduct.and.resolveTo(menuProduct({ id: 7, name: 'Taco editado' }));
    apiService.deleteMyRestaurantProduct.and.resolveTo();
    apiService.updateOrderStatus.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [RestaurantDashboardPageComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'dashboard' }] } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads restaurant profile, menu products and orders on init', () => {
    const vm = component as any;

    expect(apiService.getMyRestaurant).toHaveBeenCalled();
    expect(apiService.getMyRestaurantProducts).toHaveBeenCalled();
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect(vm.hasRestaurant).toBeTrue();
    expect(vm.restaurantForm.name).toBe('Tacos Norte 24');
    expect(vm.products.length).toBe(1);
    expect(vm.orders.length).toBe(1);
  });

  it('creates a new menu product with trimmed payload values', async () => {
    const vm = component as any;
    vm.productForm = {
      name: '  Burrito norte  ',
      price: 118,
      category: '  Burritos  ',
      description: '  Carne asada  ',
      imageUrl: '  https://img.test/burrito.jpg  ',
      available: true
    };

    await vm.saveProduct(submitEvent());

    expect(apiService.createMyRestaurantProduct).toHaveBeenCalledWith({
      name: 'Burrito norte',
      price: 118,
      category: 'Burritos',
      description: 'Carne asada',
      imageUrl: 'https://img.test/burrito.jpg',
      available: true
    });
    expect(vm.showAddProduct).toBeFalse();
    expect(vm.editingProductId).toBeNull();
  });

  it('edits an existing product instead of creating a new one', async () => {
    const vm = component as any;

    vm.startEdit(menuProduct({ id: 7, name: 'Taco original', price: '49.00' }));
    vm.productForm.name = 'Taco premium';
    await vm.saveProduct(submitEvent());

    expect(apiService.updateMyRestaurantProduct).toHaveBeenCalledWith(
      7,
      jasmine.objectContaining({ name: 'Taco premium' })
    );
    expect(apiService.createMyRestaurantProduct).not.toHaveBeenCalled();
  });

  it('updates an order status and reloads restaurant orders', async () => {
    const vm = component as any;
    apiService.getMyOrders.calls.reset();

    await vm.updateOrderStatus(1, 'ACCEPTED');

    expect(apiService.updateOrderStatus).toHaveBeenCalledWith(1, {
      status: 'ACCEPTED',
      reason: undefined
    });
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect(vm.updatingOrderId).toBeNull();
  });

  it('toggles product availability', async () => {
    const vm = component as any;

    await vm.toggleAvailability(menuProduct({ id: 7, available: true }));

    expect(apiService.updateMyRestaurantProduct).toHaveBeenCalledWith(7, {
      available: false
    });
    expect(apiService.getMyRestaurantProducts).toHaveBeenCalled();
  });
});

function submitEvent(): Event {
  return jasmine.createSpyObj<Event>('submitEvent', ['preventDefault']);
}

function ownedRestaurant(overrides: Partial<OwnedRestaurant> = {}): OwnedRestaurant {
  return {
    id: 10,
    owner_user_id: 'owner-1',
    name: 'Tacos Norte 24',
    description: 'Tacos y burritos',
    address: 'Av. Mexico 123',
    phone: '3333333333',
    is_open: true,
    created_at: '2026-05-06T00:00:00.000Z',
    ...overrides
  };
}

function menuProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 7,
    restaurant_id: 10,
    name: 'Taco de arrachera',
    description: 'Tortilla de maiz con arrachera',
    price: '49.00',
    category: 'Tacos',
    image_url: null,
    available: true,
    created_at: '2026-05-06T00:00:00.000Z',
    ...overrides
  };
}

function orderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    status: 'PENDING',
    restaurant_id: 10,
    restaurant_name: 'Tacos Norte 24',
    restaurant_address: 'Av. Mexico 123',
    delivery_address: 'Aldama 1473',
    customer_id: 'client-1',
    customer_name: 'Cliente Test',
    total: '100.00',
    delivery_fee: '25.00',
    created_at: '2026-05-06T00:00:00.000Z',
    updated_at: '2026-05-06T00:00:00.000Z',
    driver_latitude: null,
    driver_longitude: null,
    driver_accuracy: null,
    location_updated_at: null,
    ...overrides
  };
}
