import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  AdminMetrics,
  AdminUser,
  DeliveryAvailable,
  IncidentItem,
  OwnedRestaurant,
  OrderSummary,
  Product,
  Restaurant,
  RestaurantUpdate,
  UserRole
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  async getRestaurants(search = ''): Promise<Restaurant[]> {
    const params = new HttpParams().set('search', search);
    const response = await firstValueFrom(
      this.http.get<{ restaurants: Restaurant[] }>(`${environment.apiBaseUrl}/restaurants`, {
        params
      })
    );
    return response.restaurants;
  }

  async getProductsByRestaurant(restaurantId: number): Promise<Product[]> {
    const response = await firstValueFrom(
      this.http.get<{ products: Product[] }>(
        `${environment.apiBaseUrl}/restaurants/${restaurantId}/products`
      )
    );
    return response.products;
  }

  async getMyRestaurant(): Promise<OwnedRestaurant | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ restaurant: OwnedRestaurant }>(
          `${environment.apiBaseUrl}/restaurants/me`
        )
      );
      return response.restaurant;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsertMyRestaurant(payload: RestaurantUpdate): Promise<OwnedRestaurant> {
    const response = await firstValueFrom(
      this.http.put<{ restaurant: OwnedRestaurant }>(
        `${environment.apiBaseUrl}/restaurants/me`,
        payload
      )
    );
    return response.restaurant;
  }

  async getMyRestaurantProducts(): Promise<Product[]> {
    const response = await firstValueFrom(
      this.http.get<{ products: Product[] }>(
        `${environment.apiBaseUrl}/restaurants/me/products`
      )
    );
    return response.products;
  }

  async createMyRestaurantProduct(payload: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    imageUrl?: string;
    available: boolean;
  }): Promise<Product> {
    const response = await firstValueFrom(
      this.http.post<{ product: Product }>(
        `${environment.apiBaseUrl}/restaurants/me/products`,
        payload
      )
    );
    return response.product;
  }

  async updateMyRestaurantProduct(
    productId: number,
    payload: {
      name?: string;
      description?: string | null;
      price?: number;
      category?: string | null;
      imageUrl?: string | null;
      available?: boolean;
    }
  ): Promise<Product> {
    const response = await firstValueFrom(
      this.http.patch<{ product: Product }>(
        `${environment.apiBaseUrl}/restaurants/me/products/${productId}`,
        payload
      )
    );
    return response.product;
  }

  async deleteMyRestaurantProduct(productId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${environment.apiBaseUrl}/restaurants/me/products/${productId}`)
    );
  }

  async getMyOrders(): Promise<OrderSummary[]> {
    const response = await firstValueFrom(
      this.http.get<{ orders: OrderSummary[] }>(`${environment.apiBaseUrl}/orders/my`)
    );
    return response.orders;
  }

  async createOrder(payload: {
    restaurantId: number;
    deliveryAddress: string;
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    tipAmount?: number;
    paymentMethod: string;
    items: {
      productId: number;
      quantity: number;
    }[];
  }): Promise<OrderSummary> {
    const response = await firstValueFrom(
      this.http.post<{ order: OrderSummary }>(`${environment.apiBaseUrl}/orders`, payload)
    );
    return response.order;
  }

  async getOrderItems(orderId: number): Promise<Array<{
    id: number;
    product_id: number;
    quantity: number;
    unit_price: string;
    line_total: string;
    product_name: string;
    image_url?: string;
  }>> {
    const response = await firstValueFrom(
      this.http.get<{ items: any[] }>(`${environment.apiBaseUrl}/orders/${orderId}/items`)
    );
    return response.items;
  }

  async updateOrderStatus(
    orderId: number,
    payload: {
      status: 'ACCEPTED' | 'REJECTED' | 'READY_FOR_PICKUP' | 'CANCELLED';
      reason?: string;
    }
  ): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${environment.apiBaseUrl}/orders/${orderId}/status`, payload)
    );
  }

  async cancelOrder(orderId: number, reason?: string): Promise<void> {
    await this.updateOrderStatus(orderId, {
      status: 'CANCELLED',
      reason: reason ?? 'Cancelled by client'
    });
  }

  async getAvailableDeliveries(): Promise<DeliveryAvailable[]> {
    const response = await firstValueFrom(
      this.http.get<{ orders: DeliveryAvailable[] }>(
        `${environment.apiBaseUrl}/deliveries/available`
      )
    );
    return response.orders;
  }

  async acceptDelivery(orderId: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/deliveries/${orderId}/accept`, {})
    );
  }

  async updateDeliveryStatus(
    orderId: number,
    status: 'IN_TRANSIT' | 'DELIVERED'
  ): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${environment.apiBaseUrl}/deliveries/${orderId}/status`, {
        status
      })
    );
  }

  async updateDeliveryLocation(
    orderId: number,
    payload: {
      latitude: number;
      longitude: number;
      accuracy?: number | null;
    }
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/deliveries/${orderId}/location`, payload)
    );
  }

  async getIncidents(): Promise<IncidentItem[]> {
    const response = await firstValueFrom(
      this.http.get<{ incidents: IncidentItem[] }>(`${environment.apiBaseUrl}/incidents`)
    );
    return response.incidents;
  }

  async createIncident(payload: {
    orderId: number;
    title: string;
    description: string;
  }): Promise<IncidentItem> {
    const response = await firstValueFrom(
      this.http.post<{ incident: IncidentItem }>(`${environment.apiBaseUrl}/incidents`, payload)
    );
    return response.incident;
  }

  async updateIncidentStatus(
    incidentId: number,
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
  ): Promise<IncidentItem> {
    const response = await firstValueFrom(
      this.http.patch<{ incident: IncidentItem }>(
        `${environment.apiBaseUrl}/incidents/${incidentId}/status`,
        {
          status
        }
      )
    );
    return response.incident;
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    const response = await firstValueFrom(
      this.http.get<{ users: AdminUser[] }>(`${environment.apiBaseUrl}/admin/users`)
    );
    return response.users;
  }

  async updateAdminUser(
    authUserId: string,
    payload: {
      role?: UserRole;
      isActive?: boolean;
    }
  ): Promise<AdminUser> {
    const response = await firstValueFrom(
      this.http.patch<{ user: AdminUser }>(
        `${environment.apiBaseUrl}/admin/users/${authUserId}`,
        payload
      )
    );
    return response.user;
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    const response = await firstValueFrom(
      this.http.get<{ metrics: AdminMetrics }>(`${environment.apiBaseUrl}/admin/metrics`)
    );
    return response.metrics;
  }

  async getDriverStats(): Promise<{
    total_delivered: number;
    total_earnings: string;
  }> {
    const response = await firstValueFrom(
      this.http.get<{ stats: { total_delivered: number; total_earnings: string } }>(
        `${environment.apiBaseUrl}/deliveries/stats`
      )
    );
    return response.stats;
  }
}
