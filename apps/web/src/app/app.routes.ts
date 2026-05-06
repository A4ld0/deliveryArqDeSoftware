import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/login.page').then((module) => module.LoginPageComponent)
  },
  {
    path: 'restaurant',
    canActivate: [authGuard, roleGuard],
    data: { role: 'restaurant' },
    loadComponent: () =>
      import('./pages/restaurant-shell.page').then((module) => module.RestaurantShellPageComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/restaurant-dashboard.page').then(
            (module) => module.RestaurantDashboardPageComponent
          )
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/restaurant-dashboard.page').then(
            (module) => module.RestaurantDashboardPageComponent
          )
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/restaurant-dashboard.page').then(
            (module) => module.RestaurantDashboardPageComponent
          )
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/restaurant-dashboard.page').then(
            (module) => module.RestaurantDashboardPageComponent
          )
      }
    ]
  },
  {
    path: 'driver',
    canActivate: [authGuard, roleGuard],
    data: { role: 'driver' },
    loadComponent: () =>
      import('./pages/driver-shell.page').then((module) => module.DriverShellPageComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/driver-dashboard.page').then(
            (module) => module.DriverDashboardPageComponent
          )
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/driver-dashboard.page').then(
            (module) => module.DriverDashboardPageComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile.page').then((module) => module.ProfilePageComponent)
      }
    ]
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
    path: '',
    loadComponent: () =>
      import('./pages/client-shell.page').then((module) => module.ClientShellPageComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/client-shop.page').then((module) => module.ClientShopPageComponent)
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/client-checkout.page').then(
            (module) => module.ClientCheckoutPageComponent
          )
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/client-orders.page').then((module) => module.ClientOrdersPageComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/profile.page').then((module) => module.ProfilePageComponent)
      },
      {
        path: 'incidents',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/client-incidents.page').then(
            (module) => module.ClientIncidentsPageComponent
          )
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
