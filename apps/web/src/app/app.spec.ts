import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ProfileService } from './core/profile.service';
import { SessionService } from './core/session.service';

describe('App', () => {
  const profileSignal = signal(null);
  const profileService = {
    profile: profileSignal,
    ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(null),
    clear: jasmine.createSpy('clear')
  };
  const sessionService = {
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
    signOut: jasmine.createSpy('signOut').and.resolveTo()
  };

  beforeEach(async () => {
    profileSignal.set(null);
    profileService.ensureLoaded.calls.reset();
    profileService.clear.calls.reset();
    sessionService.isAuthenticated.calls.reset();
    sessionService.isAuthenticated.and.returnValue(false);
    sessionService.signOut.calls.reset();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profileService },
        { provide: SessionService, useValue: sessionService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('E4');
  });
});
