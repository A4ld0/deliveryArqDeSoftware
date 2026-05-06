export type UserRole = 'client' | 'driver' | 'restaurant' | 'admin';

export interface ApiUserProfile {
  auth_user_id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  is_open: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at?: string;
}

export interface RestaurantUpdate {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  isOpen: boolean;
  latitude?: number;
  longitude?: number;
}

export interface OwnedRestaurant extends Restaurant {
  owner_user_id: string;
}

export interface Product {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: number | string;
  category: string | null;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  status: string;
  restaurant_id: number;
  restaurant_name?: string; // Nombre opcional del negocio
  restaurant_address?: string; // Dirección del negocio
  restaurant_latitude?: number;
  restaurant_longitude?: number;
  delivery_address?: string; // Dirección de entrega
  driver_name?: string; // Nombre del repartidor
  customer_id: string;
  customer_name?: string; // Nombre del cliente
  customer_phone?: string | null;
  total: string;
  delivery_fee: string;
  tip_amount: string;
  created_at: string;
  updated_at: string;
  driver_latitude: number | null;
  driver_longitude: number | null;
  driver_accuracy: number | null;
  location_updated_at: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
}

export interface OrderStatusEvent {
  orderId: number;
  status: string;
  at: string;
}

export interface OrderLocationEvent {
  orderId: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  at: string;
}

export interface DeliveryAvailable {
  id: number;
  status: string;
  restaurant_id: number;
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_latitude?: number;
  restaurant_longitude?: number;
  total: string;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  created_at: string;
}

export interface IncidentItem {
  id: number;
  order_id: number;
  reported_by: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  auth_user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusCount {
  status: string;
  count: string;
}

export interface RoleCount {
  role: string;
  count: string;
}

export interface AdminMetrics {
  ordersByStatus: StatusCount[];
  incidentsByStatus: StatusCount[];
  usersByRole: RoleCount[];
}
