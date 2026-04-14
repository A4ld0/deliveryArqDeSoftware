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
        <aside class="hero">
          <span class="hero-chip">Acceso seguro</span>
          <h2>Gestiona tus pedidos en un solo lugar</h2>
          <p>
            Inicia sesion o crea tu cuenta para acceder al flujo de cliente, restaurante o repartidor
            con una experiencia clara y profesional.
          </p>

          <img
            src="assets/illustration-hero-delivery.svg"
            alt="Ilustracion de entrega de pedidos"
            loading="lazy"
          />

          <ul class="hero-list">
            <li>Seguimiento en tiempo real de estados del pedido</li>
            <li>Pagos simulados para pruebas academicas</li>
            <li>Permisos por rol segun tu tipo de cuenta</li>
          </ul>
        </aside>

        <section class="panel">
          <header class="panel-head">
            <h3>{{ mode() === 'login' ? 'Inicia sesion' : 'Crea tu cuenta' }}</h3>
            <p>
              {{ mode() === 'login'
                ? 'Accede con tu correo y contrasena.'
                : 'Registra tu cuenta y completa el perfil.' }}
            </p>
          </header>

          <div class="tabs" role="tablist" aria-label="Modo de acceso">
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mode() === 'login'"
              [class.active]="mode() === 'login'"
              (click)="setMode('login')"
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mode() === 'signup'"
              [class.active]="mode() === 'signup'"
              (click)="setMode('signup')"
            >
              Registro
            </button>
          </div>

          <form class="form auth-form" (submit)="onSubmitAuth($event)">
            <label>
              Correo
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                autocomplete="email"
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                autocomplete="current-password"
                placeholder="Minimo 6 caracteres"
                required
                minlength="6"
              />
            </label>

            <button type="submit" class="primary" [disabled]="loadingAuth()">
              {{ loadingAuth() ? 'Validando...' : mode() === 'login' ? 'Entrar' : 'Crear cuenta' }}
            </button>
          </form>

          @if (needsProfileForm()) {
            <section class="profile-card">
              <div class="profile-head">
                <strong>Completa tu perfil</strong>
                <p>Elige el tipo de cuenta para habilitar tu panel principal.</p>
              </div>

              <form class="form profile-form" (submit)="onSubmitProfile($event)">
                <label>
                  Nombre completo
                  <input
                    type="text"
                    [(ngModel)]="fullName"
                    name="fullName"
                    autocomplete="name"
                    placeholder="Ej. Luis Fernando Fernandez Garcia"
                    required
                  />
                </label>

                <div class="role-grid">
                  <button type="button" class="role-btn" [class.active]="role === 'client'" (click)="role = 'client'">
                    <strong>Cliente</strong>
                    <small>Pedir comida y dar seguimiento</small>
                  </button>
                  <button type="button" class="role-btn" [class.active]="role === 'restaurant'" (click)="role = 'restaurant'">
                    <strong>Restaurante</strong>
                    <small>Publicar menu y gestionar pedidos</small>
                  </button>
                  <button type="button" class="role-btn" [class.active]="role === 'driver'" (click)="role = 'driver'">
                    <strong>Entregador</strong>
                    <small>Tomar entregas y actualizar estado</small>
                  </button>
                </div>

                <div class="grid-two">
                  <label>
                    Telefono (opcional)
                    <input
                      type="text"
                      [(ngModel)]="phone"
                      name="phone"
                      autocomplete="tel"
                      placeholder="Ej. 3331234567"
                    />
                  </label>

                  <label>
                    Direccion (opcional)
                    <input
                      type="text"
                      [(ngModel)]="address"
                      name="address"
                      autocomplete="street-address"
                      placeholder="Calle y numero"
                    />
                  </label>
                </div>

                <button type="submit" class="primary" [disabled]="loadingProfile()">
                  {{ loadingProfile() ? 'Guardando...' : 'Guardar y continuar' }}
                </button>
              </form>
            </section>
          }
        </section>
      </article>

      @if (message()) {
        <p class="feedback message">{{ message() }}</p>
      }

      @if (errorMessage()) {
        <p class="feedback error">{{ errorMessage() }}</p>
      }
    </section>
  `,
  styles: `
    .auth-layout {
      max-width: 1240px;
      width: 100%;
    }

    .auth-shell {
      display: grid;
      gap: var(--space-4);
      background: rgb(255 253 249 / 88%);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .hero {
      background:
        radial-gradient(circle at 100% 0%, rgb(255 167 121 / 38%) 0, transparent 48%),
        linear-gradient(160deg, #fff7f1 0%, #ffeedd 100%);
      border-bottom: 1px solid var(--line);
      padding: var(--space-5);
      display: grid;
      gap: var(--space-3);
    }

    .hero-chip {
      width: fit-content;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--primary-strong);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 0.28rem 0.62rem;
      text-transform: uppercase;
    }

    .hero h2 { margin: 0; }
    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }

    .hero img {
      width: 100%;
      max-width: 360px;
      justify-self: start;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: #fff;
      padding: var(--space-3);
    }

    .hero-list {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.28rem;
      color: #5f4a3f;
      font-size: 0.93rem;
    }

    .panel {
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
    }

    .panel-head h3 {
      margin: 0;
      font-size: clamp(1.2rem, 1.2vw, 1.45rem);
    }

    .panel-head p {
      margin: 0.35rem 0 0;
      color: var(--muted);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-1);
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 0.3rem;
    }

    .tabs button {
      border: 0;
      background: transparent;
      border-radius: 10px;
      min-height: 44px;
      padding: 0.45rem 0.8rem;
      font-weight: 700;
      color: #614738;
      cursor: pointer;
    }

    .tabs button.active {
      color: #2f1e14;
      background: var(--primary-soft);
      box-shadow: inset 0 0 0 1px rgb(255 107 53 / 30%);
    }

    .form {
      display: grid;
      gap: var(--space-3);
    }

    label {
      display: grid;
      gap: 0.42rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: #533f33;
    }

    input {
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      padding: 0.62rem 0.72rem;
      font: inherit;
      background: #fff;
    }

    .primary {
      border: 0;
      border-radius: 12px;
      padding: 0.62rem 0.94rem;
      min-height: 50px;
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
    }

    button[disabled] {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .profile-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: linear-gradient(180deg, #fffaf4 0%, #fffdf9 100%);
      padding: var(--space-4);
      display: grid;
      gap: var(--space-3);
    }

    .profile-head strong {
      display: block;
      font-family: 'Sora', 'Manrope', sans-serif;
      font-size: 1.02rem;
    }

    .profile-head p {
      margin: 0.28rem 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }

    .role-grid {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .role-btn {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      text-align: left;
      padding: var(--space-3);
      display: grid;
      gap: 0.1rem;
      color: #3b291f;
      cursor: pointer;
    }

    .role-btn strong { font-size: 0.94rem; }
    .role-btn small {
      color: var(--muted);
      font-size: 0.8rem;
      line-height: 1.3;
    }

    .role-btn.active {
      border-color: var(--primary);
      background: var(--primary-soft);
    }

    .grid-two {
      display: grid;
      gap: var(--space-3);
    }

    .feedback {
      margin: var(--space-4) 0 0;
      border-radius: 10px;
      padding: 0.68rem 0.9rem;
      font-weight: 700;
      width: fit-content;
      max-width: 100%;
    }

    .message {
      color: #9e4a1d;
      border: 1px solid #ffc9a8;
      background: #fff4ec;
    }

    .error {
      color: #9c1d1d;
      border: 1px solid #f6b0b0;
      background: #fff4f4;
    }

    @media (min-width: 980px) {
      .auth-shell {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }

      .hero {
        border-bottom: 0;
        border-right: 1px solid var(--line);
      }

      .grid-two {
        grid-template-columns: 1fr 1fr;
      }
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
          'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.'
        );
        return;
      }

      const profile = await this.profileService.ensureLoaded(true);
      if (profile) {
        await this.router.navigateByUrl(routeByRole(profile.role));
        return;
      }

      this.message.set('Sesion iniciada. Falta completar perfil para habilitar permisos.');
      this.needsProfileForm.set(true);
    } catch (error) {
      this.errorMessage.set(this.toErrorMessage(error, 'Error inesperado de autenticacion.'));
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
        this.errorMessage.set('No se pudo recuperar el perfil despues de guardar.');
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
