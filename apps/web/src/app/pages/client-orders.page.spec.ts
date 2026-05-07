import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiService } from '../core/api.service';
import type { OrderSummary } from '../core/models';
import { OrderEventsService } from '../core/order-events.service';
import { ClientOrdersPageComponent } from './client-orders.page';

describe('ClientOrdersPageComponent', () => {
  let fixture: ComponentFixture<ClientOrdersPageComponent>;
  let component: ClientOrdersPageComponent;
  let apiService: jasmine.SpyObj<ApiService>;
  let orderEventsService: jasmine.SpyObj<OrderEventsService>;
  let eventHandlers: Parameters<OrderEventsService['connect']>[0];
  let eventSource: { close: jasmine.Spy };

  beforeEach(async () => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', [
      'getMyOrders',
      'getOrderItems',
      'cancelOrder'
    ]);
    orderEventsService = jasmine.createSpyObj<OrderEventsService>('OrderEventsService', [
      'connect'
    ]);
    eventSource = { close: jasmine.createSpy('close') };

    apiService.getMyOrders.and.resolveTo([orderSummary({ id: 1, status: 'PENDING' })]);
    apiService.getOrderItems.and.resolveTo([
      {
        id: 1,
        product_id: 7,
        quantity: 2,
        unit_price: '49.00',
        line_total: '98.00',
        product_name: 'Taco'
      }
    ]);
    apiService.cancelOrder.and.resolveTo();
    orderEventsService.connect.and.callFake(async (handlers) => {
      eventHandlers = handlers;
      return eventSource as unknown as EventSource;
    });

    await TestBed.configureTestingModule({
      imports: [ClientOrdersPageComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: OrderEventsService, useValue: orderEventsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientOrdersPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('loads client orders and connects realtime events on boot', () => {
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect(orderEventsService.connect).toHaveBeenCalled();
    expect((component as any).orders().length).toBe(1);
  });

  it('updates an order status when a realtime status event arrives', () => {
    eventHandlers.onOrderStatusChanged({
      orderId: 1,
      status: 'ACCEPTED',
      at: '2026-05-06T00:00:00.000Z'
    });

    expect((component as any).orders()[0].status).toBe('ACCEPTED');
  });

  it('updates driver location when a realtime GPS event arrives', () => {
    eventHandlers.onOrderLocationChanged?.({
      orderId: 1,
      latitude: 20.676,
      longitude: -103.347,
      accuracy: 15,
      at: '2026-05-06T00:00:00.000Z'
    });

    const updated = (component as any).orders()[0] as OrderSummary;
    expect(updated.driver_latitude).toBe(20.676);
    expect(updated.driver_longitude).toBe(-103.347);
    expect(updated.driver_accuracy).toBe(15);
    expect(updated.location_updated_at).toBe('2026-05-06T00:00:00.000Z');
  });

  it('loads order items when the product tray is opened', async () => {
    const vm = component as any;

    await vm.toggleItems(1);

    expect(vm.expandedOrders()).toEqual([1]);
    expect(apiService.getOrderItems).toHaveBeenCalledWith(1);
    expect(vm.itemsMap()[1][0].product_name).toBe('Taco');

    await vm.toggleItems(1);
    expect(vm.expandedOrders()).toEqual([]);
  });

  it('cancels an order and reloads the list', async () => {
    apiService.getMyOrders.calls.reset();

    await (component as any).cancelOrder(1);

    expect(apiService.cancelOrder).toHaveBeenCalledWith(1);
    expect(apiService.getMyOrders).toHaveBeenCalled();
    expect((component as any).cancellingOrderId()).toBeNull();
  });

  it('closes the realtime connection on destroy', () => {
    component.ngOnDestroy();

    expect(eventSource.close).toHaveBeenCalled();
  });
});

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
    driver_name: null as unknown as string,
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
