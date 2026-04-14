import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ApiUserProfile, UserRole } from './models';
import { SessionService } from './session.service';

interface GetProfileResponse {
  user: ApiUserProfile;
}

interface UpsertProfileResponse {
  profile: {
    auth_user_id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly profileSignal = signal<ApiUserProfile | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly loadedSignal = signal(false);
  private loadedForUserId: string | null = null;

  readonly profile = computed(() => this.profileSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly loaded = computed(() => this.loadedSignal());

  constructor(
    private readonly http: HttpClient,
    private readonly sessionService: SessionService
  ) {}

  clear(): void {
    this.profileSignal.set(null);
    this.loadingSignal.set(false);
    this.loadedSignal.set(false);
    this.loadedForUserId = null;
  }

  async ensureLoaded(force = false): Promise<ApiUserProfile | null> {
    await this.sessionService.waitUntilReady();
    const session = this.sessionService.session();
    const userId = session?.user.id ?? null;

    if (!userId) {
      this.clear();
      return null;
    }

    if (!force && this.loadedSignal() && this.loadedForUserId === userId) {
      return this.profileSignal();
    }

    this.loadingSignal.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<GetProfileResponse>(`${environment.apiBaseUrl}/auth/me`)
      );
      this.profileSignal.set(response.user);
      this.loadedSignal.set(true);
      this.loadedForUserId = userId;
      return response.user;
    } catch (error) {
      if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
        this.profileSignal.set(null);
        this.loadedSignal.set(true);
        this.loadedForUserId = userId;
        return null;
      }
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async upsertProfile(payload: {
    fullName: string;
    role: UserRole;
    phone?: string;
    address?: string;
  }): Promise<void> {
    await firstValueFrom(
      this.http.post<UpsertProfileResponse>(`${environment.apiBaseUrl}/auth/profile`, payload)
    );
    await this.ensureLoaded(true);
  }
}

