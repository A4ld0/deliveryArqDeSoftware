import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../core/session.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionService = inject(SessionService);
  const token = sessionService.getAccessToken();

  if (!token) {
    return next(request);
  }

  const authenticated = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authenticated);
};

