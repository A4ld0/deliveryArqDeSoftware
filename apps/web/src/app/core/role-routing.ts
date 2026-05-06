import type { UserRole } from './models';

export function routeByRole(role: UserRole): string {
  switch (role) {
    case 'client':
      return '/';
    case 'restaurant':
      return '/restaurant';
    case 'driver':
      return '/driver';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

