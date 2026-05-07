import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { ApiUserProfile } from '../core/models';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';
import { LoginPageComponent } from './login.page';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let profileSignal: ReturnType<typeof signal<ApiUserProfile | null>>;
  let sessionService: {
    waitUntilReady: jasmine.Spy;
    isAuthenticated: jasmine.Spy;
    signIn: jasmine.Spy;
    signUp: jasmine.Spy;
  };
  let profileService: {
    profile: ReturnType<typeof signal<ApiUserProfile | null>>;
    ensureLoaded: jasmine.Spy;
    upsertProfile: jasmine.Spy;
  };
  let router: { navigateByUrl: jasmine.Spy };

  beforeEach(async () => {
    profileSignal = signal<ApiUserProfile | null>(null);
    sessionService = {
      waitUntilReady: jasmine.createSpy('waitUntilReady').and.resolveTo(),
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      signIn: jasmine.createSpy('signIn'),
      signUp: jasmine.createSpy('signUp')
    };
    profileService = {
      profile: profileSignal,
      ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(null),
      upsertProfile: jasmine.createSpy('upsertProfile')
    };
    router = {
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true)
    };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: ProfileService, useValue: profileService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('changes between login and signup mode and clears feedback messages', () => {
    const vm = component as any;
    vm.message.set('Mensaje previo');
    vm.errorMessage.set('Error previo');

    vm.setMode('signup');

    expect(vm.mode()).toBe('signup');
    expect(vm.message()).toBe('');
    expect(vm.errorMessage()).toBe('');
  });

  it('signs in and asks for profile data when the user has no profile', async () => {
    const vm = component as any;
    vm.email = 'cliente@example.com';
    vm.password = 'secret123';
    sessionService.signIn.and.resolveTo({
      data: { session: { access_token: 'token' } },
      error: null
    });
    profileService.ensureLoaded.and.resolveTo(null);

    await vm.onSubmitAuth(submitEvent());

    expect(sessionService.signIn).toHaveBeenCalledWith('cliente@example.com', 'secret123');
    expect(vm.needsProfileForm()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows a confirmation message when signup requires email confirmation', async () => {
    const vm = component as any;
    vm.setMode('signup');
    vm.email = 'nuevo@example.com';
    vm.password = 'secret123';
    sessionService.signUp.and.resolveTo({
      data: { session: null },
      error: null
    });

    await vm.onSubmitAuth(submitEvent());

    expect(sessionService.signUp).toHaveBeenCalledWith('nuevo@example.com', 'secret123');
    expect(vm.message()).toContain('Cuenta creada');
  });

  it('saves the profile and redirects to the role route', async () => {
    const vm = component as any;
    vm.fullName = 'Rider Test';
    vm.role = 'driver';
    profileService.upsertProfile.and.callFake(async () => {
      profileSignal.set({
        auth_user_id: 'driver-1',
        email: 'driver@example.com',
        fullName: 'Rider Test',
        role: 'driver',
        isActive: true
      });
    });

    await vm.onSubmitProfile(submitEvent());

    expect(profileService.upsertProfile).toHaveBeenCalledWith({
      fullName: 'Rider Test',
      role: 'driver',
      phone: undefined,
      address: undefined
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/driver');
  });
});

function submitEvent(): Event {
  return jasmine.createSpyObj<Event>('submitEvent', ['preventDefault']);
}
