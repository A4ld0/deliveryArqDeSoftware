import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';
import { ApiService } from '../core/api.service';
import type { UserRole } from '../core/models';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="profile-container anim-fade-in">
      <div class="profile-card">
        <header class="profile-header">
          <div class="profile-avatar">
            {{ (profile()?.fullName ?? 'U').charAt(0) }}
          </div>
          <div class="profile-header-text">
            <h2>{{ profile()?.fullName }}</h2>
            <p>{{ roleLabel(profile()?.role) }}</p>
          </div>
          <button class="logout-top-btn" (click)="logout()">Cerrar Sesión</button>
        </header>

        @if (loading()) {
          <div class="loading-state">
            <span class="spinner"></span>
            <p>Sincronizando perfil...</p>
          </div>
        } @else {
          <!-- DRIVER STATS -->
          @if (profile()?.role === 'driver' && driverStats()) {
            <div class="driver-stats-grid anim-slide-up">
              <div class="stat-box">
                <span class="stat-val">{{ driverStats()?.total_delivered }}</span>
                <span class="stat-lab">Pedidos Entregados</span>
              </div>
              <div class="stat-box">
                <span class="stat-val">\${{ driverStats()?.total_earnings }}</span>
                <span class="stat-lab">Ganancias Totales</span>
              </div>
            </div>
          }

          <form (submit)="saveProfile($event)" class="profile-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" [(ngModel)]="formData.fullName" name="fullName" required placeholder="Tu nombre">
              </div>

              <div class="form-group">
                <label>Correo (No editable)</label>
                <input type="email" [value]="profile()?.email" disabled class="disabled-input">
              </div>

              <div class="form-group">
                <label>Teléfono de contacto</label>
                <input type="tel" [(ngModel)]="formData.phone" name="phone" placeholder="Ej. 3312345678">
              </div>

              <div class="form-group">
                <label>Dirección de referencia</label>
                <textarea [(ngModel)]="formData.address" name="address" placeholder="Calle, número, colonia..." rows="3"></textarea>
              </div>
            </div>

            <div class="profile-actions">
              <button type="submit" class="btn-save" [disabled]="saving()">
                @if (saving()) { <span class="spinner spinner-white"></span> }
                @else { Guardar Cambios }
              </button>
              
              <button type="button" class="btn-logout-mobile" (click)="logout()">
                Cerrar Sesión
              </button>
            </div>

            @if (message()) { <div class="alert alert-success">{{ message() }}</div> }
            @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    .profile-container { max-width: 650px; margin: 3rem auto; padding: 0 1.5rem; }
    .profile-card { background: white; border-radius: 32px; border: 1.5px solid var(--line); padding: 3rem; box-shadow: 0 10px 40px rgba(0,0,0,0.03); }
    
    .profile-header { display: flex; align-items: center; gap: 2rem; margin-bottom: 3rem; }
    .profile-avatar { width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, #ff6b4a 100%); display: grid; place-items: center; font-size: 2.5rem; font-weight: 900; color: white; border: 4px solid white; box-shadow: 0 10px 25px var(--primary-soft); }
    .profile-header-text h2 { margin: 0; font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; }
    .profile-header-text p { margin: 0.3rem 0 0; color: var(--primary); font-weight: 750; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }

    .logout-top-btn { margin-left: auto; background: var(--bg-app); border: 1.5px solid var(--line); padding: 0.6rem 1.2rem; border-radius: 99px; font-weight: 800; font-size: 0.8rem; cursor: pointer; transition: 0.2s; color: var(--muted); }
    .logout-top-btn:hover { background: #fef2f2; color: #b91c1c; border-color: #fee2e2; }

    .driver-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 3rem; }
    .stat-box { background: var(--bg-app); border: 1.5px solid var(--line); border-radius: 24px; padding: 1.5rem; text-align: center; display: grid; gap: 0.3rem; }
    .stat-val { font-size: 1.8rem; font-weight: 900; color: var(--ink); }
    .stat-lab { font-size: 0.75rem; font-weight: 750; color: var(--muted); text-transform: uppercase; }

    .profile-form { display: grid; gap: 2.5rem; }
    .form-grid { display: grid; gap: 1.5rem; }
    .form-group { display: grid; gap: 0.6rem; }
    .form-group label { font-size: 0.85rem; font-weight: 850; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    
    input, textarea { padding: 1.1rem; border-radius: 16px; border: 1.5px solid var(--line); background: var(--bg-app); font-family: inherit; font-size: 1rem; font-weight: 600; transition: 0.2s; }
    input:focus, textarea:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px var(--primary-soft); }
    .disabled-input { background: #f8f9fa; color: var(--muted); cursor: not-allowed; opacity: 0.8; }

    .profile-actions { display: grid; gap: 1rem; }
    .btn-save { background: var(--ink); color: white; border: none; padding: 1.2rem; border-radius: 99px; font-weight: 850; font-size: 1.1rem; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.8rem; }
    .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
    .btn-save:disabled { opacity: 0.6; }

    .btn-logout-mobile { display: none; background: transparent; border: 1.5px solid #fee2e2; color: #b91c1c; padding: 1rem; border-radius: 99px; font-weight: 800; cursor: pointer; }

    .alert { padding: 1.2rem; border-radius: 18px; font-weight: 750; font-size: 0.9rem; text-align: center; }
    .alert-success { background: #f0fdf4; color: #15803d; border: 1.5px solid #bbf7d0; }
    .alert-error { background: #fef2f2; color: #b91c1c; border: 1.5px solid #fee2e2; }

    .loading-state { text-align: center; padding: 4rem; display: grid; place-items: center; gap: 1rem; color: var(--muted); font-weight: 600; }
    .spinner { width: 2.2rem; height: 2.2rem; border: 3px solid rgba(0,0,0,0.05); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .spinner-white { width: 1.2rem; height: 1.2rem; border-top-color: white; border-width: 2px; }

    @media (max-width: 600px) {
      .logout-top-btn { display: none; }
      .btn-logout-mobile { display: block; }
      .profile-header { flex-direction: column; text-align: center; }
      .profile-card { padding: 2rem; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `
})
export class ProfilePageComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly apiService = inject(ApiService);
  
  protected readonly profile = this.profileService.profile;
  protected readonly loading = this.profileService.loading;
  protected readonly driverStats = signal<{ total_delivered: number; total_earnings: string } | null>(null);
  
  protected formData = {
    fullName: '',
    phone: '',
    address: ''
  };

  protected saving = signal(false);
  protected message = signal('');
  protected error = signal('');

  async ngOnInit() {
    const user = await this.profileService.ensureLoaded();
    if (user) {
      this.formData = {
        fullName: user.fullName,
        phone: user.phone ?? '',
        address: user.address ?? ''
      };
      if (user.role === 'driver') {
        void this.loadDriverStats();
      }
    }
  }

  private async loadDriverStats() {
    try {
      const stats = await this.apiService.getDriverStats();
      this.driverStats.set(stats);
    } catch (e) {
      console.warn('Could not load driver stats', e);
    }
  }

  async saveProfile(event: Event) {
    event.preventDefault();
    this.saving.set(true);
    this.message.set('');
    this.error.set('');

    try {
      const user = this.profile();
      if (!user) throw new Error('No se pudo cargar el perfil');

      await this.profileService.upsertProfile({
        fullName: this.formData.fullName,
        role: user.role,
        phone: this.formData.phone,
        address: this.formData.address
      });
      
      this.message.set('Perfil actualizado con éxito');
      setTimeout(() => this.message.set(''), 3000);
    } catch (err) {
      this.error.set('Error al actualizar el perfil');
      console.error(err);
    } finally {
      this.saving.set(false);
    }
  }

  async logout() {
    await this.sessionService.signOut();
  }

  roleLabel(role?: string): string {
    const map: any = {
      client: 'Cliente E4',
      restaurant: 'Socio E4 - Negocio',
      driver: 'Socio E4 - Repartidor',
      admin: 'Administrador E4'
    };
    return map[role || ''] ?? 'Usuario';
  }
}
