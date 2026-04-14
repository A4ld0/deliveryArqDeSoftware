import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.page').then((module) => module.HomePageComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/login.page').then((module) => module.LoginPageComponent)
  },
  {
    path: 'client',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./pages/client-shell.page').then((module) => module.ClientShellPageComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'shop'
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./pages/client-shop.page').then((module) => module.ClientShopPageComponent)
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./pages/client-checkout.page').then(
            (module) => module.ClientCheckoutPageComponent
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/client-orders.page').then((module) => module.ClientOrdersPageComponent)
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import('./pages/client-incidents.page').then(
            (module) => module.ClientIncidentsPageComponent
          )
      }
    ]
  },
  {
    path: 'restaurant',
    canActivate: [authGuard, roleGuard],
    data: { role: 'restaurant' },
    loadComponent: () =>
      import('./pages/restaurant-dashboard.page').then(
        (module) => module.RestaurantDashboardPageComponent
      )
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard],
    data: { role: 'driver' },
    loadComponent: () =>
      import('./pages/driver-dashboard.page').then(
        (module) => module.DriverDashboardPageComponent
      )
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    loadComponent: () =>
      import('./pages/admin-dashboard.page').then(
        (module) => module.AdminDashboardPageComponent
      )
  },
  {
    path: '**',
    redirectTo: ''
  }
];
