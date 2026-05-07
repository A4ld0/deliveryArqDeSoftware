import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiService } from '../core/api.service';
import type { ApiUserProfile } from '../core/models';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';
import { ProfilePageComponent } from './profile.page';

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let profileSignal: ReturnType<typeof signal<ApiUserProfile | null>>;
  let loadingSignal: ReturnType<typeof signal<boolean>>;
  let profileService: {
    profile: typeof profileSignal;
    loading: typeof loadingSignal;
    ensureLoaded: jasmine.Spy;
    upsertProfile: jasmine.Spy;
  };
  let sessionService: { signOut: jasmine.Spy };
  let apiService: { getDriverStats: jasmine.Spy };

  beforeEach(async () => {
    profileSignal = signal<ApiUserProfile | null>({
      auth_user_id: 'client-1',
      email: 'client@example.com',
      fullName: 'Cliente Test',
      role: 'client',
      isActive: true,
      phone: '3333333333',
      address: 'Aldama 1473'
    });
    loadingSignal = signal(false);
    profileService = {
      profile: profileSignal,
      loading: loadingSignal,
      ensureLoaded: jasmine.createSpy('ensureLoaded').and.resolveTo(profileSignal()),
      upsertProfile: jasmine.createSpy('upsertProfile').and.resolveTo()
    };
    sessionService = {
      signOut: jasmine.createSpy('signOut').and.resolveTo()
    };
    apiService = {
      getDriverStats: jasmine.createSpy('getDriverStats').and.resolveTo({
        total_delivered: 8,
        total_earnings: '400.00'
      })
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: SessionService, useValue: sessionService },
        { provide: ApiService, useValue: apiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads the current profile into the edit form', () => {
    const vm = component as any;

    expect(profileService.ensureLoaded).toHaveBeenCalled();
    expect(vm.formData).toEqual({
      fullName: 'Cliente Test',
      phone: '3333333333',
      address: 'Aldama 1473'
    });
  });

  it('saves the profile using the current role', async () => {
    const vm = component as any;
    vm.formData = {
      fullName: 'Cliente Editado',
      phone: '3311111111',
      address: 'Nueva direccion 123'
    };

    await vm.saveProfile(submitEvent());

    expect(profileService.upsertProfile).toHaveBeenCalledWith({
      fullName: 'Cliente Editado',
      role: 'client',
      phone: '3311111111',
      address: 'Nueva direccion 123'
    });
    expect(vm.saving()).toBeFalse();
    expect(vm.message()).toContain('Perfil actualizado');
  });

  it('loads driver stats only for driver profiles', async () => {
    profileSignal.set({
      auth_user_id: 'driver-1',
      email: 'driver@example.com',
      fullName: 'Driver Test',
      role: 'driver',
      isActive: true
    });
    profileService.ensureLoaded.and.resolveTo(profileSignal());

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiService.getDriverStats).toHaveBeenCalled();
    expect((component as any).driverStats()).toEqual({
      total_delivered: 8,
      total_earnings: '400.00'
    });
  });

  it('sets an error message when saving fails', async () => {
    spyOn(console, 'error');
    profileService.upsertProfile.and.rejectWith(new Error('API error'));

    await (component as any).saveProfile(submitEvent());

    expect((component as any).error()).toBe('Error al actualizar el perfil');
    expect((component as any).saving()).toBeFalse();
  });

  it('signs out from the current session', async () => {
    await (component as any).logout();

    expect(sessionService.signOut).toHaveBeenCalled();
  });

  it('returns friendly labels by role', () => {
    const vm = component as any;

    expect(vm.roleLabel('client')).toBe('Cliente E4');
    expect(vm.roleLabel('restaurant')).toBe('Socio E4 - Negocio');
    expect(vm.roleLabel('driver')).toBe('Socio E4 - Repartidor');
    expect(vm.roleLabel('admin')).toBe('Administrador E4');
    expect(vm.roleLabel(undefined)).toBe('Usuario');
  });
});

function submitEvent(): Event {
  return jasmine.createSpyObj<Event>('submitEvent', ['preventDefault']);
}
