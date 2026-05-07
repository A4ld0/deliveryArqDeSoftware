import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { ApiUserProfile, DeliveryAvailable, OrderSummary } from '../core/models';
import { ProfileService } from '../core/profile.service';
import { DriverDashboardPageComponent } from './driver-dashboard.page';

describe('DriverDashboardPageComponent', () => {
  let fixture: ComponentFixture<DriverDashboardPageComponent>;
  let component: DriverDashboardPageComponent;
  let apiService: jasmine.SpyObj<ApiService>;
  let watchPosition: jasmine.Spy;
  let clearWatch: jasmine.Spy;

  beforeEach(async () => {
    watchPosition = jasmine.createSpy('watchPosition').and.returnValue(99);
    clearWatch = jasmine.createSpy('clearWatch');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition,
        clearWatch
      }
    });

    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'getAvailableDeliveries',
      'getMyOrders',
      'getDriverStats',
      'getOrderItems',
      'acceptDelivery',
      'updateDeliveryStatus',
      'updateDeliveryLocation'
    ]);

    apiService.getAvailableDeliveries.and.resolveTo([availableDelivery()]);
    apiService.getMyOrders.and.resolveTo([
      orderSummary({ id: 1, status: 'ASSIGNED' }),
      orderSummary({ id: 2, status: 'DELIVERED' })
    ]);
    apiService.getDriverStats.and.resolveTo({ total_delivered: 5, total_earnings: '250.00' });
    apiService.getOrderItems.and.resolveTo([
      {
        id: 1,
        product_id: 7,
        quantity: 1,
        unit_price: '49.00',
        line_total: '49.00',
        product_name: 'Taco'
      }
    ]);
    apiService.acceptDelivery.and.resolveTo();
    apiService.updateDeliveryStatus.and.resolveTo();
    apiService.updateDeliveryLocation.and.resolveTo();

    const profile = signal<ApiUserProfile | null>({
      auth_user_id: 'driver-1',
      email: 'driver@example.com',
      fullName: 'Repartidor Test',
      role: 'driver',
      isActive: true
    });

    await TestBed.configureTestingModule({
      imports: [DriverDashboardPageComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ProfileService, useValue: { profile } },
        { provide: ActivatedRoute, useValue: { snapshot: { url: [{ path: 'dashboard' }] } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DriverDashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    delete (navigator as any).geolocation;
  });

  it('loads available deliveries, assigned orders and driver stats', () => {
    const vm = component as any;

    expect(apiService.getAvailableDeliveries).toHaveBeenCalled();
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect(apiService.getDriverStats).toHaveBeenCalled();
    expect(vm.available().length).toBe(1);
    expect(vm.myOrders().length).toBe(2);
    expect(vm.driverStats()).toEqual({ total_delivered: 5, total_earnings: '250.00' });
  });

  it('accepts an available delivery and reloads dashboard data', async () => {
    const vm = component as any;
    apiService.getAvailableDeliveries.calls.reset();
    apiService.getMyOrders.calls.reset();

    await vm.acceptDelivery(10);

    expect(apiService.acceptDelivery).toHaveBeenCalledWith(10);
    expect(apiService.getAvailableDeliveries).toHaveBeenCalled();
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect(vm.takingOrderId).toBeNull();
  });

  it('starts GPS tracking when the driver begins a route', async () => {
    const position = {
      coords: {
        latitude: 20.676,
        longitude: -103.347,
        accuracy: 12.4
      }
    } as GeolocationPosition;
    watchPosition.and.callFake((success: PositionCallback) => {
      success(position);
      return 123;
    });

    await (component as any).updateDeliveryStatus(1, 'IN_TRANSIT');
    await fixture.whenStable();

    expect(apiService.updateDeliveryStatus).toHaveBeenCalledWith(1, 'IN_TRANSIT');
    expect(watchPosition).toHaveBeenCalled();
    expect((component as any).trackingOrderId).toBe(1);
    expect(apiService.updateDeliveryLocation).toHaveBeenCalledWith(1, {
      latitude: 20.676,
      longitude: -103.347,
      accuracy: 12.4
    });
  });

  it('stops GPS tracking when the delivery is completed', async () => {
    const vm = component as any;
    vm.trackingOrderId = 1;
    vm.gpsWatchId = 123;

    await vm.updateDeliveryStatus(1, 'DELIVERED');

    expect(apiService.updateDeliveryStatus).toHaveBeenCalledWith(1, 'DELIVERED');
    expect(clearWatch).toHaveBeenCalledWith(123);
    expect(vm.trackingOrderId).toBeNull();
  });

  it('loads order items only when a delivery is expanded', async () => {
    const vm = component as any;

    await vm.toggleItems(1);

    expect(vm.expandedOrderId()).toBe(1);
    expect(apiService.getOrderItems).toHaveBeenCalledWith(1);
    expect(vm.itemsMap()[1][0].product_name).toBe('Taco');

    await vm.toggleItems(1);
    expect(vm.expandedOrderId()).toBeNull();
  });
});

function availableDelivery(overrides: Partial<DeliveryAvailable> = {}): DeliveryAvailable {
  return {
    id: 10,
    status: 'READY_FOR_PICKUP',
    restaurant_id: 20,
    total: '100.00',
    delivery_address: 'Aldama 1473',
    created_at: '2026-05-06T00:00:00.000Z',
    ...overrides
  };
}

function orderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: 1,
    status: 'ASSIGNED',
    restaurant_id: 20,
    restaurant_name: 'Sushi N Go',
    restaurant_address: 'Av. Vallarta 100',
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
