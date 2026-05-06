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

        <!-- Left: hero panel -->
        <aside class="hero">
          <span class="hero-chip">
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/></svg>
            Acceso seguro
          </span>
          <h2>Gestiona tus pedidos en un solo lugar</h2>
          <p>
            Inicia sesión o crea tu cuenta para acceder al flujo de cliente,
            restaurante o repartidor con una experiencia clara y profesional.
          </p>

          <img
            src="assets/illustration-hero-delivery.svg"
            alt="Ilustración de entrega de pedidos"
            loading="lazy"
            class="hero-img"
          />

          <ul class="hero-list">
            <li>
              <span class="list-icon">✓</span>
              Seguimiento en tiempo real del estado del pedido
            </li>
            <li>
              <span class="list-icon">✓</span>
              Pagos simulados para pruebas académicas
            </li>
            <li>
              <span class="list-icon">✓</span>
              Permisos por rol según tu tipo de cuenta
            </li>
          </ul>
        </aside>

        <!-- Right: form panel -->
        <section class="panel">
          <header class="panel-head">
            <h3>{{ mode() === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta' }}</h3>
            <p>
              {{ mode() === 'login'
                ? 'Accede con tu correo y contraseña.'
                : 'Regístrate y completa tu perfil para comenzar.' }}
            </p>
          </header>

          <!-- Tab switcher -->
          <div class="tabs" role="tablist" aria-label="Modo de acceso">
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mode() === 'login'"
              [class.active]="mode() === 'login'"
              (click)="setMode('login')"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="mode() === 'signup'"
              [class.active]="mode() === 'signup'"
              (click)="setMode('signup')"
            >
              Registrarse
            </button>
          </div>

          <!-- Auth form -->
          <form class="form" (submit)="onSubmitAuth($event)">
            <label>
              <span class="label-text">Correo electrónico</span>
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
              <span class="label-text">Contraseña</span>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                autocomplete="current-password"
                placeholder="Mínimo 6 caracteres"
                required
                minlength="6"
              />
            </label>

            <button type="submit" class="btn-submit" [disabled]="loadingAuth()">
              @if (loadingAuth()) {
                <span class="spinner"></span>
                Validando...
              } @else {
                {{ mode() === 'login' ? 'Entrar' : 'Crear cuenta' }}
              }
            </button>
          </form>

          <!-- Profile completion -->
          @if (needsProfileForm()) {
            <section class="profile-card">
              <div class="profile-head">
                <div class="profile-icon">👤</div>
                <div>
                  <strong>Completa tu perfil</strong>
                  <p>Elige el tipo de cuenta para habilitar tu panel principal.</p>
                </div>
              </div>

              <form class="form profile-form" (submit)="onSubmitProfile($event)">
                <label>
                  <span class="label-text">Nombre completo</span>
                  <input
                    type="text"
                    [(ngModel)]="fullName"
                    name="fullName"
                    autocomplete="name"
                    placeholder="Ej. Luis Fernando Fernández García"
                    required
                  />
                </label>

                <div>
                  <span class="label-text" style="display:block;margin-bottom:0.6rem;">Tipo de cuenta</span>
                  <div class="role-grid">
                    <button type="button" class="role-btn" [class.active]="role === 'client'" (click)="role = 'client'">
                      <span class="role-icon">🛒</span>
                      <strong>Cliente</strong>
                      <small>Pedir comida y dar seguimiento</small>
                    </button>
                    <button type="button" class="role-btn" [class.active]="role === 'restaurant'" (click)="role = 'restaurant'">
                      <span class="role-icon">🍽️</span>
                      <strong>Restaurante</strong>
                      <small>Publicar menú y gestionar pedidos</small>
                    </button>
                    <button type="button" class="role-btn" [class.active]="role === 'driver'" (click)="role = 'driver'">
                      <span class="role-icon">🚴</span>
                      <strong>Entregador</strong>
                      <small>Tomar entregas y actualizar estado</small>
                    </button>
                  </div>
                </div>

                <div class="grid-two">
                  <label>
                    <span class="label-text">Teléfono <span class="optional">(opcional)</span></span>
                    <input
                      type="text"
                      [(ngModel)]="phone"
                      name="phone"
                      autocomplete="tel"
                      placeholder="Ej. 3331234567"
                    />
                  </label>

                  <label>
                    <span class="label-text">Dirección <span class="optional">(opcional)</span></span>
                    <input
                      type="text"
                      [(ngModel)]="address"
                      name="address"
                      autocomplete="street-address"
                      placeholder="Calle y número"
                    />
                  </label>
                </div>

                <button type="submit" class="btn-submit" [disabled]="loadingProfile()">
                  @if (loadingProfile()) {
                    <span class="spinner"></span>
                    Guardando...
                  } @else {
                    Guardar y continuar →
                  }
                </button>
              </form>
            </section>
          }
        </section>
      </article>

      @if (message()) {
        <div class="feedback feedback--message">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          {{ message() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="feedback feedback--error">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          {{ errorMessage() }}
        </div>
      }
    </section>
  `,
  styles: `
    .auth-layout {
      width: 100%;
      display: grid;
      gap: var(--space-4);
    }

    .auth-shell {
      display: grid;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    /* ── Hero side ── */
    .hero {
      background:
        radial-gradient(ellipse at 100% 0%, rgba(255, 167, 121, 0.35) 0, transparent 52%),
        linear-gradient(160deg, #fff7f0 0%, #ffeedd 100%);
      border-bottom: 1px solid var(--line);
      padding: var(--space-6) var(--space-5);
      display: grid;
      gap: var(--space-4);
      align-content: start;
    }

    .hero-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.38rem;
      width: fit-content;
      border-radius: 999px;
      border: 1px solid var(--primary-muted);
      background: rgba(255, 255, 255, 0.7);
      color: var(--primary-strong);
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.28rem 0.72rem;
      text-transform: uppercase;
    }

    .hero-chip svg {
      width: 0.5rem;
      height: 0.5rem;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .hero h2 { margin: 0; max-width: 22ch; }

    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.65;
      max-width: 44ch;
    }

    .hero-img {
      width: 100%;
      max-width: 340px;
      border-radius: var(--radius-md);
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.6);
      padding: var(--space-3);
    }

    .hero-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: var(--space-2);
    }

    .hero-list li {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      color: #5f4a3f;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .list-icon {
      width: 1.3rem;
      height: 1.3rem;
      border-radius: 50%;
      background: var(--primary-soft);
      border: 1px solid var(--primary-muted);
      color: var(--primary-strong);
      font-size: 0.68rem;
      font-weight: 800;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    /* ── Form panel ── */
    .panel {
      padding: var(--space-6) var(--space-5);
      display: grid;
      gap: var(--space-5);
      align-content: start;
    }

    .panel-head h3 {
      margin: 0;
      font-size: clamp(1.25rem, 1.5vw, 1.5rem);
    }

    .panel-head p {
      margin: var(--space-2) 0 0;
      color: var(--muted);
      font-size: 0.9rem;
    }

    /* ── Tabs ── */
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      padding: 0.28rem;
      gap: 0.28rem;
    }

    .tabs button {
      border: 0;
      background: transparent;
      border-radius: calc(var(--radius-md) - 0.3rem);
      min-height: 2.5rem;
      padding: 0.42rem 0.8rem;
      font-weight: 600;
      font-size: 0.87rem;
      color: var(--muted);
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .tabs button.active {
      background: var(--panel);
      color: var(--ink);
      font-weight: 700;
      box-shadow: var(--shadow-xs);
    }

    /* ── Form ── */
    .form {
      display: grid;
      gap: var(--space-4);
    }

    label {
      display: grid;
      gap: 0.4rem;
    }

    .label-text {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    .optional {
      font-weight: 400;
      color: var(--muted-2);
    }

    input {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      font: inherit;
      font-size: 0.93rem;
      background: var(--surface);
      color: var(--ink);
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      min-height: 44px;
    }

    input:hover { border-color: var(--line-strong); }
    input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.12);
    }
    input::placeholder { color: var(--muted-2); }

    /* ── Submit button ── */
    .btn-submit {
      border: 0;
      border-radius: var(--radius-sm);
      min-height: 48px;
      padding: 0.65rem 1.1rem;
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-weight: 700;
      font-size: 0.93rem;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      box-shadow: 0 4px 14px rgba(248, 92, 35, 0.28);
      width: 100%;
    }

    .btn-submit:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 8px 22px rgba(248, 92, 35, 0.36);
    }

    .btn-submit[disabled] { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Profile card ── */
    .profile-card {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-lg);
      background: linear-gradient(165deg, var(--surface) 0%, #fffaf3 100%);
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
    }

    .profile-head {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .profile-icon {
      font-size: 1.8rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .profile-head strong {
      display: block;
      font-family: 'Sora', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ink);
    }

    .profile-head p {
      margin: 0.3rem 0 0;
      color: var(--muted);
      font-size: 0.88rem;
    }

    /* ── Role grid ── */
    .role-grid {
      display: grid;
      gap: var(--space-2);
    }

    .role-btn {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--panel);
      text-align: left;
      padding: var(--space-3) var(--space-3);
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      column-gap: var(--space-2);
      align-items: center;
      color: var(--ink);
      cursor: pointer;
      transition: all 0.18s ease;
      min-height: auto;
    }

    .role-btn:hover:not(.active) {
      border-color: var(--line-strong);
      background: var(--surface-alt);
    }

    .role-btn.active {
      border-color: var(--primary);
      background: var(--primary-soft);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.1);
    }

    .role-icon {
      font-size: 1.5rem;
      line-height: 1;
      grid-row: span 2;
    }

    .role-btn strong { font-size: 0.9rem; font-weight: 700; }
    .role-btn small {
      color: var(--muted);
      font-size: 0.78rem;
      line-height: 1.3;
    }

    .role-btn.active small { color: var(--primary-strong); }

    /* ── 2-col grid ── */
    .grid-two {
      display: grid;
      gap: var(--space-3);
    }

    /* ── Feedback messages ── */
    .feedback {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .feedback svg {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }

    .feedback--message {
      background: var(--primary-soft);
      border: 1px solid var(--primary-muted);
      color: var(--primary-strong);
    }

    .feedback--error {
      background: var(--danger-soft);
      border: 1px solid #fecaca;
      color: var(--danger);
    }

    /* ── Responsive ── */
    @media (min-width: 680px) {
      .role-grid {
        grid-template-columns: repeat(3, 1fr);
      }

      .role-btn {
        grid-template-columns: 1fr;
        grid-template-rows: auto auto auto;
        text-align: left;
      }

      .role-icon { grid-row: 1; font-size: 1.8rem; margin-bottom: 0.3rem; }
    }

    @media (min-width: 980px) {
      .auth-shell {
        grid-template-columns: 1fr 1fr;
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