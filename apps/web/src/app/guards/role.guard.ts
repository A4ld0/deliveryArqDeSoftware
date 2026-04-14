import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';
import type { UserRole } from '../core/models';
import { routeByRole } from '../core/role-routing';

export const roleGuard: CanActivateFn = async (route) => {
  const requiredRole = route.data['role'] as UserRole | undefined;
  const router = inject(Router);
  const sessionService = inject(SessionService);
  const profileService = inject(ProfileService);

  await sessionService.waitUntilReady();
  if (!sessionService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const profile = await profileService.ensureLoaded();
  if (!profile) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!requiredRole || profile.role === requiredRole) {
    return true;
  }

  return router.createUrlTree([routeByRole(profile.role)]);
};

