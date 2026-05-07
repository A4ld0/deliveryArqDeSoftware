import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ApiUserProfile } from '../core/models';
import { ApiService } from '../core/api.service';
import { ClientOrderStateService } from '../core/client-order-state.service';
import { ProfileService } from '../core/profile.service';
import { ClientCheckoutPageComponent } from './client-checkout.page';

describe('ClientCheckoutPageComponent', () => {
  let fixture: ComponentFixture<ClientCheckoutPageComponent>;
  let component: ClientCheckoutPageComponent;
  let cartSignal: ReturnType<typeof signal<Array<{ productId: number; name: string; price: number; quantity: number }>>>;
  let restaurantIdSignal: ReturnType<typeof signal<number | null>>;
  let profileSignal: ReturnType<typeof signal<ApiUserProfile | null>>;
  let apiService: { createOrder: jasmine.Spy };
  let orderState: {
    cart: typeof cartSignal;
    selectedRestaurantId: typeof restaurantIdSignal;
    selectedRestaurantName: ReturnType<typeof signal<string>>;
    cartSubtotal: ReturnType<typeof computed<number>>;
    clearCart: jasmine.Spy;
  };
  let profileService: {
    profile: typeof profileSignal;
    ensureLoaded: jasmine.Spy;
    upsertProfile: jasmine.Spy;
  };

  beforeEach(async () => {
    localStorage.clear();
    cartSignal = signal([
      { productId: 1, name: 'Taco', price: 40, quantity: 2 },
      { productId: 2, name: 'Agua', price: 25, quantity: 1 }
    ]);
    restaurantIdSignal = signal<number | null>(10);
    profileSignal = signal<ApiUserProfile | null>({
      auth_user_id: 'client-1',
      email: 'client@example.com',
      fullName: 'Cliente Test',
      role: 'client',
      isActive: true,
      address: 'Aldama 1473'
    });
    apiService = {
      createOrder: jasmine.createSpy('createOrder').and.resolveTo({ id: 77, status: 'PENDING' })
    };
    orderState = {
      cart: cartSignal,
      selectedRestaurantId: restaurantIdSignal,
      selectedRestaurantName: signal('Tacos Norte 24'),
      cartSubtotal: computed(() =>
        cartSignal().reduce((sum, line) => sum + line.price * line.quantity, 0)
      ),
      clearCart: jasmine.createSpy('clearCart').and.callFake(() => cartSignal.set([]))
    };
    profileService = {
      profile: profileSignal,
      ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(profileSignal()),
      upsertProfile: jasmine.createSpy('upsertProfile').and.resolveTo()
    };

    await TestBed.configureTestingModule({
      imports: [ClientCheckoutPageComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiService },
        { provide: ClientOrderStateService, useValue: orderState },
        { provide: ProfileService, useValue: profileService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientCheckoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates an order from the current cart and clears checkout state', async () => {
    const vm = component as any;
    vm.deliveryAddress = 'Aldama 1473';
    vm.paymentMethod = 'SIMULATED_CASH';

    await vm.confirmOrder();

    expect(apiService.createOrder).toHaveBeenCalledWith({
      restaurantId: 10,
      deliveryAddress: 'Aldama 1473',
      paymentMethod: 'SIMULATED_CASH',
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 }
      ]
    });
    expect(orderState.clearCart).toHaveBeenCalled();
    expect(localStorage.getItem('last_delivery_address')).toBe('Aldama 1473');
  });

  it('does not create an order when the cart is empty', async () => {
    cartSignal.set([]);

    await (component as any).confirmOrder();

    expect(apiService.createOrder).not.toHaveBeenCalled();
    expect(orderState.clearCart).not.toHaveBeenCalled();
  });

  it('stores an API error message when checkout fails', async () => {
    apiService.createOrder.and.rejectWith(new Error('Network error'));
    const vm = component as any;
    vm.deliveryAddress = 'Aldama 1473';

    await vm.confirmOrder();

    expect(vm.errorMessage).toBe('No se pudo procesar el pago.');
    expect(orderState.clearCart).not.toHaveBeenCalled();
  });
});
