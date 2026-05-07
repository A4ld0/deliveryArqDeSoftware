import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { UserRole } from '../core/models';
import { ProfileService } from '../core/profile.service';
import { routeByRole } from '../core/role-routing';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="auth-layout">
      <article class="auth-shell">

        <!-- Lado Visual: Marketing B2C (Tipo UberEats/Rappi) -->
        <aside class="hero-sidebar">
          <div class="hero-content">
            <span class="hero-badge">🛵 Entrega en minutos</span>
            <h2>¿Qué se te antoja <span>hoy?</span></h2>
            <p>Tus restaurantes favoritos, supermercado y farmacia a la puerta de tu casa.</p>
          </div>
          
          <!-- Un bloque visual de comida/delivery -->
          <div class="hero-graphic">
             <div class="floating-card c1">🍕 Pizza Caliente</div>
             <div class="floating-card c2">🍣 Sushi 2x1</div>
             <div class="floating-card c3">🍔 Hamburguesas</div>
          </div>
        </aside>

        <!-- Lado de Formulario: Limpio y Amigable -->
        <section class="form-panel">
          
          <div class="form-container">
            <!-- Logo B2C -->
            <div class="brand-header">
              <div class="brand__badge">E4</div>
              <h1>Delivery</h1>
            </div>

            <header class="form-header">
              <h3>{{ mode() === 'login' ? '¡Hola de nuevo!' : 'Crea tu cuenta' }}</h3>
              <p>{{ mode() === 'login' ? 'Ingresa para pedir tus favoritos.' : 'Regístrate y recibe promociones exclusivas.' }}</p>
            </header>

            <!-- Píldoras de Navegación -->
            <nav class="auth-tabs" role="tablist" aria-label="Acceso a la plataforma" aria-orientation="horizontal">
              <button 
                type="button"
                role="tab"
                id="login-tab"
                aria-controls="auth-login-panel"
                [attr.aria-selected]="mode() === 'login'"
                [attr.tabindex]="mode() === 'login' ? 0 : -1"
                [class.active]="mode() === 'login'" 
                (keydown)="onTabKeydown($event, 'login')"
                (click)="setMode('login')">
                Ingresar
              </button>
              <button 
                type="button"
                role="tab"
                id="signup-tab"
                aria-controls="auth-login-panel"
                [attr.aria-selected]="mode() === 'signup'"
                [attr.tabindex]="mode() === 'signup' ? 0 : -1"
                [class.active]="mode() === 'signup'" 
                (keydown)="onTabKeydown($event, 'signup')"
                (click)="setMode('signup')">
                Registrarse
              </button>
            </nav>

            <form id="auth-login-panel" class="auth-form" role="tabpanel" [attr.aria-labelledby]="mode() === 'login' ? 'login-tab' : 'signup-tab'" [attr.aria-busy]="loadingAuth()" (submit)="onSubmitAuth($event)">
              <div class="input-group">
                <label class="sr-only" for="email">Correo electrónico</label>
                <input type="email" id="email" [(ngModel)]="email" name="email" placeholder="Correo electrónico" required autocomplete="email" />
              </div>

              <div class="input-group">
                <label class="sr-only" for="password">Contraseña</label>
                <input type="password" id="password" [(ngModel)]="password" name="password" placeholder="Contraseña" required minlength="6" autocomplete="current-password" />
              </div>

              <button type="submit" class="btn-primary-auth" [disabled]="loadingAuth()" [attr.aria-busy]="loadingAuth()">
                @if (loadingAuth()) {
                  <span class="auth-spinner"></span>
                } @else {
                  {{ mode() === 'login' ? 'Continuar' : 'Crear cuenta' }}
                }
              </button>
            </form>

            <!-- Paso 2: Completar Perfil -->
            @if (needsProfileForm()) {
              <div class="profile-overlay">
                <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" aria-describedby="profile-dialog-description">
                  <header>
                    <h4 id="profile-dialog-title">Casi listo</h4>
                    <p id="profile-dialog-description">Cuéntanos un poco más sobre ti para terminar.</p>
                  </header>

                  <form class="profile-form" [attr.aria-busy]="loadingProfile()" (submit)="onSubmitProfile($event)">
                    <div class="input-group">
                      <label class="sr-only" for="fullName">Nombre completo</label>
                      <input type="text" id="fullName" [(ngModel)]="fullName" name="fullName" placeholder="Tu nombre y apellido" required autocomplete="name" />
                    </div>

                    <div class="role-selector">
                      <label id="role-selector-label">¿Cómo vas a usar la app?</label>
                      <div class="role-options" role="radiogroup" aria-labelledby="role-selector-label">
                        <!-- Opciones amigables -->
                        <button type="button" class="role-card" role="radio" [class.active]="role === 'client'" [attr.aria-checked]="role === 'client'" [attr.tabindex]="role === 'client' ? 0 : -1" (click)="role = 'client'">
                          <span class="role-emoji">🍔</span>
                          <div class="role-meta">
                            <strong>Quiero pedir comida</strong>
                            <small>Cliente</small>
                          </div>
                        </button>
                        <button type="button" class="role-card" role="radio" [class.active]="role === 'restaurant'" [attr.aria-checked]="role === 'restaurant'" [attr.tabindex]="role === 'restaurant' ? 0 : -1" (click)="role = 'restaurant'">
                          <span class="role-emoji">🏪</span>
                          <div class="role-meta">
                            <strong>Quiero vender</strong>
                            <small>Restaurante / Tienda</small>
                          </div>
                        </button>
                        <button type="button" class="role-card" role="radio" [class.active]="role === 'driver'" [attr.aria-checked]="role === 'driver'" [attr.tabindex]="role === 'driver' ? 0 : -1" (click)="role = 'driver'">
                          <span class="role-emoji">🛵</span>
                          <div class="role-meta">
                            <strong>Quiero repartir</strong>
                            <small>Socio Conductor</small>
                          </div>
                        </button>
                      </div>
                    </div>

                    <button type="submit" class="btn-primary-auth" [disabled]="loadingProfile()" [attr.aria-busy]="loadingProfile()">
                      Comenzar a usar E4
                    </button>
                  </form>
                </div>
              </div>
            }
          </div>
        </section>
      </article>

      <!-- Alertas -->
      <div class="notifications" aria-live="polite" aria-atomic="true">
        @if (message()) { <div class="toast success" role="status">{{ message() }}</div> }
        @if (errorMessage()) { <div class="toast error" role="alert">{{ errorMessage() }}</div> }
      </div>
    </section>
  `,
  styles: `
    .auth-layout { display: flex; align-items: center; justify-content: center; min-height: 90vh; padding: 2rem; background: #F7F7F7; }
    
    .auth-shell {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      width: 100%;
      max-width: 1000px;
      background: var(--white);
      border-radius: 32px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      min-height: 600px;
    }

    /* Columna Visual (Naranja Rappi) */
    .hero-sidebar {
      background: var(--primary);
      padding: 3.5rem;
      color: white;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .hero-badge { background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 99px; font-weight: 700; font-size: 0.85rem; width: fit-content; margin-bottom: 2rem; }
    .hero-content h2 { font-size: 2.8rem; line-height: 1.1; margin-bottom: 1rem; font-weight: 800; letter-spacing: -1px; }
    .hero-content h2 span { color: #FFE0D4; }
    .hero-content p { font-size: 1.1rem; opacity: 0.9; line-height: 1.4; }

    .hero-graphic { margin-top: auto; display: flex; flex-direction: column; gap: 1rem; position: relative; bottom: -20px;}
    .floating-card { background: white; color: var(--ink); padding: 12px 20px; border-radius: 16px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 10px 20px rgba(0,0,0,0.1); width: fit-content; }
    .c1 { transform: rotate(-5deg); align-self: flex-start; }
    .c2 { transform: rotate(3deg); align-self: center; }
    .c3 { transform: rotate(-2deg); align-self: flex-end; }

    /* Columna de Formulario */
    .form-panel { padding: 3rem 4rem; background: #ffffff; display: flex; flex-direction: column; justify-content: center; position: relative; }
    .form-container { width: 100%; max-width: 380px; margin: 0 auto; }

    .brand-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2.5rem; justify-content: center; }
    .brand__badge { background: var(--primary); color: white; padding: 6px 10px; border-radius: 8px; font-weight: 900; font-size: 1.1rem; }
    .brand-header h1 { font-size: 1.2rem; font-weight: 800; margin: 0; }

    .form-header { text-align: center; margin-bottom: 2rem; }
    .form-header h3 { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }
    .form-header p { color: var(--ink-mid); font-size: 0.9rem; }

    /* Tabs (Píldoras tipo Uber) */
    .auth-tabs { display: flex; background: #F1F1F1; padding: 4px; border-radius: 99px; margin-bottom: 2rem; }
    .auth-tabs button { flex: 1; border: none; padding: 12px; border-radius: 99px; font-weight: 800; font-size: 0.9rem; color: var(--ink-mid); cursor: pointer; transition: all 0.2s; background: transparent; }
    .auth-tabs button.active { background: white; color: var(--ink); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

    /* Inputs B2C Grandes */
    .auth-form { display: grid; gap: 1rem; }
    
    .input-group input {
      width: 100%;
      padding: 16px 20px;
      border-radius: 16px;
      border: 2px solid transparent;
      background: #F4F4F4;
      font-size: 1rem;
      font-weight: 500;
      font-family: inherit;
      transition: all 0.2s;
    }

    .input-group input:focus { outline: none; background: white; border-color: var(--ink); }
    .input-group input::placeholder { color: #A0A0A0; }

    /* Botón de Acción Principal */
    .btn-primary-auth {
      background: var(--primary); color: white; border: none; padding: 16px; border-radius: 99px; font-weight: 800; font-size: 1.05rem; cursor: pointer; transition: transform 0.2s; margin-top: 0.5rem; width: 100%; display: flex; justify-content: center;
    }
    .btn-primary-auth:hover { transform: scale(1.02); }
    .btn-primary-auth:disabled { opacity: 0.7; transform: none; }

    /* Modal de Perfil */
    .profile-overlay { position: absolute; inset: 0; background: white; padding: 3rem 4rem; z-index: 10; display: flex; flex-direction: column; justify-content: center; border-radius: 32px; }
    .profile-modal header h4 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
    .profile-modal header p { color: var(--ink-mid); margin-bottom: 2rem; }
    
    .role-selector label { font-weight: 800; display: block; margin: 1.5rem 0 1rem; }
    .role-options { display: grid; gap: 0.8rem; margin-bottom: 2rem; }
    
    .role-card {
      display: flex; align-items: center; gap: 1rem; padding: 16px; border-radius: 16px; border: 2px solid #F1F1F1; background: white; cursor: pointer; transition: all 0.2s; text-align: left;
    }
    .role-card.active { border-color: var(--primary); background: var(--primary-soft); }
    .role-emoji { font-size: 1.8rem; }
    .role-meta strong { display: block; font-size: 1rem; font-weight: 800; color: var(--ink); }
    .role-meta small { font-size: 0.8rem; color: var(--ink-mid); }

    /* Toasts */
    .notifications { position: fixed; top: 2rem; right: 2rem; display: grid; gap: 0.5rem; z-index: 2000; }
    .toast { padding: 16px 24px; border-radius: 16px; color: white; font-weight: 800; font-size: 0.9rem; box-shadow: 0 10px 30px rgba(0,0,0,0.15); animation: dropIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .toast.success { background: var(--ink); }
    .toast.error { background: #FF3B30; }
    @keyframes dropIn { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* Responsive */
    @media (max-width: 900px) {
      .auth-shell { grid-template-columns: 1fr; border-radius: 0; min-height: 100vh; }
      .hero-sidebar { display: none; }
      .auth-layout { padding: 0; }
      .form-panel { padding: 2rem; }
      .profile-overlay { padding: 2rem; border-radius: 0; }
    }
  `
})

export class LoginPageComponent {
  protected readonly mode = signal<'login' | 'signup'>('login');
  protected readonly loadingAuth = signal(false);
  protected readonly loadingProfile = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');
  protected readonly needsProfileForm = signal(false);

  protected email = '';
  protected password = '';

  protected fullName = '';
  protected role: UserRole = 'client';
  protected phone = '';
  protected address = '';

  constructor(
    private readonly sessionService: SessionService,
    private readonly profileService: ProfileService,
    private readonly router: Router
  ) {
    void this.boot();
  }

  private async boot(): Promise<void> {
    await this.sessionService.waitUntilReady();
    if (!this.sessionService.isAuthenticated()) return;

    const profile = await this.profileService.ensureLoaded();
    if (profile) {
      await this.router.navigateByUrl(routeByRole(profile.role));
      return;
    }

    this.needsProfileForm.set(true);
  }

  protected async onSubmitAuth(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');
    this.message.set('');
    this.loadingAuth.set(true);

    try {
      const response =
        this.mode() === 'login'
          ? await this.sessionService.signIn(this.email, this.password)
          : await this.sessionService.signUp(this.email, this.password);

      if (response.error) {
        this.errorMessage.set(response.error.message);
        return;
      }

      if (this.mode() === 'signup' && !response.data.session) {
        this.message.set(
          'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'
        );
        return;
      }

      const profile = await this.profileService.ensureLoaded(true);
      if (profile) {
        await this.router.navigateByUrl(routeByRole(profile.role));
        return;
      }

      this.message.set('Sesión iniciada. Falta completar perfil para habilitar permisos.');
      this.needsProfileForm.set(true);
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error, 'Error inesperado de autenticación.'));
    } finally {
      this.loadingAuth.set(false);
    }
  }

  protected async onSubmitProfile(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');
    this.message.set('');
    this.loadingProfile.set(true);

    try {
      await this.profileService.upsertProfile({
        fullName: this.fullName,
        role: this.role,
        phone: this.phone || undefined,
        address: this.address || undefined
      });

      const profile = this.profileService.profile();
      if (!profile) {
        this.errorMessage.set('No se pudo recuperar el perfil después de guardar.');
        return;
      }

      await this.router.navigateByUrl(routeByRole(profile.role));
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error, 'No se pudo guardar el perfil.'));
    } finally {
      this.loadingProfile.set(false);
    }
  }

  protected setMode(next: 'login' | 'signup'): void {
    if (this.mode() === next) return;
    this.mode.set(next);
    this.message.set('');
    this.errorMessage.set('');
  }

  protected onTabKeydown(event: KeyboardEvent, current: 'login' | 'signup'): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    this.setMode(current === 'login' ? 'signup' : 'login');
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string; details?: unknown } | null;
      if (payload?.error) {
        if (typeof payload.details === 'string' && payload.details.trim().length > 0) {
          return `${payload.error} (${payload.details})`;
        }
        return payload.error;
      }
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }

    if (error instanceof Error) return error.message;
    return fallback;
  }
}
