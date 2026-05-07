import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '../core/session.service';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let sessionService: { getAccessToken: jasmine.Spy };

  beforeEach(() => {
    sessionService = {
      getAccessToken: jasmine.createSpy('getAccessToken')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds the bearer token when a session token exists', () => {
    sessionService.getAccessToken.and.returnValue('token-123');

    http.get('/secure').subscribe();

    const request = httpMock.expectOne('/secure');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({});
  });

  it('leaves requests untouched when there is no token', () => {
    sessionService.getAccessToken.and.returnValue(null);

    http.get('/public').subscribe();

    const request = httpMock.expectOne('/public');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
  });
});
