import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates an order with the expected payload', async () => {
    const payload = {
      restaurantId: 10,
      deliveryAddress: 'Aldama 1473',
      paymentMethod: 'SIMULATED_CARD',
      items: [{ productId: 1, quantity: 2 }]
    };

    const resultPromise = service.createOrder(payload);
    const request = httpMock.expectOne(`${environment.apiBaseUrl}/orders`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush({ order: { id: 55, status: 'PENDING' } });
    await expectAsync(resultPromise).toBeResolvedTo({ id: 55, status: 'PENDING' });
  });

  it('sends delivery GPS location updates', async () => {
    const resultPromise = service.updateDeliveryLocation(12, {
      latitude: 20.676,
      longitude: -103.347,
      accuracy: 18
    });

    const request = httpMock.expectOne(`${environment.apiBaseUrl}/deliveries/12/location`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      latitude: 20.676,
      longitude: -103.347,
      accuracy: 18
    });

    request.flush({ delivery: { order_id: 12 } });
    await expectAsync(resultPromise).toBeResolved();
  });

  it('loads products by restaurant', async () => {
    const resultPromise = service.getProductsByRestaurant(9);
    const request = httpMock.expectOne(`${environment.apiBaseUrl}/restaurants/9/products`);

    expect(request.request.method).toBe('GET');

    request.flush({
      products: [
        {
          id: 1,
          restaurant_id: 9,
          name: 'Pizza',
          description: null,
          price: '120.00',
          category: 'Pizza',
          image_url: null,
          available: true,
          created_at: '2026-05-06T00:00:00.000Z'
        }
      ]
    });

    const products = await resultPromise;
    expect(products.length).toBe(1);
    expect(products[0].name).toBe('Pizza');
  });
});
