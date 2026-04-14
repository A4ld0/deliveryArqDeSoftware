import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../core/session.service';

export const authGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  await sessionService.waitUntilReady();
  if (sessionService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

