import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-driver-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="driver-layout">
      <!-- SIDEBAR -->
      <aside class="sidebar" aria-label="Panel de navegacion del repartidor">
        <div class="sidebar-header">
          <div class="brand">E4</div>
          <div class="brand-tag">Delivery</div>
        </div>

        <nav class="sidebar-nav" aria-label="Menu del repartidor">
          <a routerLink="dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>Servicios</span>
          </a>

          <a routerLink="history" routerLinkActive="active">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Historial</span>
          </a>

          <a routerLink="profile" routerLinkActive="active">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Perfil</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <button type="button" (click)="logout()" class="logout-btn" aria-label="Cerrar sesion del repartidor">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main class="content-area">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .driver-layout { display: flex; height: 100vh; background: var(--bg-app); overflow: hidden; }
    
    .sidebar {
      width: 280px;
      background: var(--ink);
      color: white;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      border-right: 1px solid rgba(255,255,255,0.05);
    }

    .sidebar-header { padding: 3rem 2rem; }
    .brand { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
    .brand-tag { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: var(--primary); margin-top: 0.2rem; }

    .sidebar-nav { flex: 1; padding: 0 1rem; display: grid; align-content: start; gap: 0.5rem; }
    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      padding: 1.2rem 1.5rem;
      text-decoration: none;
      color: rgba(255,255,255,0.6);
      font-weight: 700;
      font-size: 0.95rem;
      border-radius: 20px;
      transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar-nav a svg { width: 1.4rem; height: 1.4rem; }
    .sidebar-nav a:hover { color: white; background: rgba(255,255,255,0.05); }
    .sidebar-nav a.active { color: white; background: var(--primary); box-shadow: 0 10px 25px var(--primary-soft); }

    .sidebar-footer { padding: 2rem; border-top: 1px solid rgba(255,255,255,0.05); }
    .logout-btn {
      width: 100%;
      background: rgba(255,255,255,0.05);
      border: 1.5px solid rgba(255,255,255,0.1);
      color: white;
      padding: 1.2rem;
      border-radius: 18px;
      font-weight: 750;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      cursor: pointer;
      transition: 0.2s;
    }
    .logout-btn:hover { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    .content-area { flex: 1; min-width: 0; padding: 2rem; overflow-y: auto; }

    @media (max-width: 900px) {
      .driver-layout { flex-direction: column; }
      .sidebar {
        width: 100%;
        height: auto;
        position: fixed;
        bottom: 0;
        top: auto;
        z-index: 1000;
        flex-direction: row;
        padding: 0.5rem;
        border-right: none;
        border-top: 1.5px solid var(--line);
        background: rgba(20, 20, 25, 0.95);
        backdrop-filter: blur(20px);
      }
      .sidebar-header, .sidebar-footer { display: none; }
      .sidebar-nav { flex-direction: row; padding: 0; justify-content: space-around; width: 100%; }
      .sidebar-nav a { flex-direction: column; gap: 0.4rem; padding: 0.8rem; font-size: 0.7rem; border-radius: 12px; }
      .sidebar-nav a svg { width: 1.3rem; height: 1.3rem; }
      .content-area { padding: 1.5rem 1.5rem 100px; }
    }
  `
})
export class DriverShellPageComponent {
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  async logout() {
    await this.sessionService.signOut();
    this.profileService.clear();
    await this.router.navigateByUrl('/auth/login');
  }
}
