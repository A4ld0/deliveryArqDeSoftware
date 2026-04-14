export type UserRole = 'client' | 'driver' | 'restaurant' | 'admin';

export interface ApiUserProfile {
  authUserId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  address: string;
  phone: string | null;
  is_open: boolean;
  created_at: string;
  updated_at?: string;
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
  customer_id: string;
  total: string;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusEvent {
  orderId: number;
  status: string;
  at: string;
}

export interface DeliveryAvailable {
  id: number;
  status: string;
  restaurant_id: number;
  total: string;
  delivery_address: string;
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
