import { Injectable, computed, signal } from '@angular/core';
import {
  type AuthResponse,
  type Session,
  type SupabaseClient,
  createClient
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly client: SupabaseClient;
  private readonly readySignal = signal(false);
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly initPromise: Promise<void>;

  readonly ready = computed(() => this.readySignal());
  readonly session = computed(() => this.sessionSignal());
  readonly isAuthenticated = computed(() => Boolean(this.sessionSignal()));

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    this.initPromise = this.initialize();
  }

  async waitUntilReady(): Promise<void> {
    await this.initPromise;
  }

  getAccessToken(): string | null {
    return this.sessionSignal()?.access_token ?? null;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    return this.client.auth.signUp({ email, password });
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this.sessionSignal.set(null);
  }

  private async initialize(): Promise<void> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      this.sessionSignal.set(null);
      this.readySignal.set(true);
      return;
    }

    this.sessionSignal.set(data.session);
    this.client.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
    });
    this.readySignal.set(true);
  }
}

