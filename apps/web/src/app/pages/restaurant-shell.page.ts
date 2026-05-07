import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileService } from '../core/profile.service';
import { SessionService } from '../core/session.service';

@Component({
  selector: 'app-restaurant-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <!-- SIDEBAR -->
      <aside class="admin-sidebar" aria-label="Panel de navegacion del restaurante">
        <div class="sidebar-brand">
          <div class="brand-badge">E4</div>
          <div class="brand-info">
            <span class="brand-name">Business</span>
            <span class="brand-role">Restaurant Admin</span>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Menu del restaurante">
          <a routerLink="dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Resumen
          </a>
          <a routerLink="orders" routerLinkActive="active">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            Pedidos
          </a>
          <a routerLink="products" routerLinkActive="active">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Menú
          </a>
          <a routerLink="settings" routerLinkActive="active">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            Configuración
          </a>
        </nav>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="admin-main">
        <header class="admin-topbar">
          <div class="topbar-welcome">
            <h2>Gestión de Negocio</h2>
            <p>Monitorea y controla tu restaurante en tiempo real.</p>
          </div>
          <div class="topbar-actions">
            <div class="user-pill">
              <span class="user-initials">R</span>
              <span class="user-name">{{ profile()?.fullName }}</span>
            </div>
            <button type="button" class="logout-btn" (click)="logout()" title="Cerrar sesion" aria-label="Cerrar sesion del restaurante">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </header>

        <div class="admin-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg-app);
    }

    /* ── SIDEBAR ── */
    .admin-sidebar {
      width: 280px;
      background: var(--ink);
      color: white;
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      border-right: 1px solid rgba(255,255,255,0.05);
      z-index: 100;
    }

    .sidebar-brand {
      padding: 3rem 2rem;
      display: flex;
      align-items: center;
      gap: 1.2rem;
    }
    .brand-badge {
      background: var(--primary);
      color: white;
      font-weight: 900;
      padding: 0.6rem 0.9rem;
      border-radius: 14px;
      font-size: 1.4rem;
      box-shadow: 0 8px 20px var(--primary-soft);
    }
    .brand-info { display: flex; flex-direction: column; }
    .brand-name { font-weight: 900; font-size: 1.3rem; letter-spacing: -0.03em; line-height: 1; }
    .brand-role { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800; margin-top: 0.3rem; }

    .sidebar-nav { flex: 1; padding: 0 1.2rem; display: grid; align-content: start; gap: 0.6rem; }
    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      padding: 1.1rem 1.4rem;
      border-radius: 18px;
      text-decoration: none;
      color: rgba(255,255,255,0.55);
      font-weight: 700;
      font-size: 0.98rem;
      transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar-nav a svg { width: 1.4rem; height: 1.4rem; }
    .sidebar-nav a:hover:not(.active) { color: white; background: rgba(255,255,255,0.05); }
    .sidebar-nav a.active { background: white; color: var(--ink); box-shadow: 0 10px 30px rgba(0,0,0,0.15); }

    /* ── MAIN ── */
    .admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .admin-topbar {
      height: 110px;
      background: white;
      border-bottom: 1px solid var(--line);
      padding: 0 3.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
      backdrop-filter: blur(20px);
    }

    .topbar-welcome h2 { margin: 0; font-size: 1.6rem; font-weight: 900; letter-spacing: -0.02em; }
    .topbar-welcome p { margin: 0.3rem 0 0; color: var(--muted); font-size: 0.95rem; font-weight: 600; }

    .topbar-actions { display: flex; align-items: center; gap: 1.5rem; }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 1.2rem;
      background: var(--bg-app);
      border-radius: 99px;
      border: 1.5px solid var(--line);
    }
    .user-initials { width: 36px; height: 36px; background: var(--ink); color: white; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 0.85rem; }
    .user-name { font-weight: 800; font-size: 0.95rem; color: var(--ink); }

    .logout-btn {
      width: 48px; height: 48px; border-radius: 16px; border: 1.5px solid var(--line); background: white; color: var(--muted);
      display: grid; place-items: center; cursor: pointer; transition: 0.2s;
    }
    .logout-btn svg { width: 22px; height: 22px; }
    .logout-btn:hover { background: #fee2e2; color: #b91c1c; border-color: #fecaca; transform: translateY(-3px); }

    .admin-content { padding: 3.5rem; flex: 1; overflow-y: auto; }

    @media (max-width: 1100px) {
      .admin-layout { flex-direction: column; }
      .admin-sidebar {
        width: 100%; height: auto; position: fixed; bottom: 0; top: auto; z-index: 1000;
        flex-direction: row; padding: 0.6rem; border-right: none; border-top: 1.5px solid var(--line);
        background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(20px);
      }
      .sidebar-brand, .brand-info { display: none; }
      .sidebar-nav { flex-direction: row; padding: 0; justify-content: space-around; width: 100%; }
      .sidebar-nav a { flex-direction: column; gap: 0.4rem; padding: 0.8rem; font-size: 0.7rem; border-radius: 14px; }
      .sidebar-nav a svg { width: 1.3rem; height: 1.3rem; }
      .admin-topbar { height: auto; padding: 1.5rem; border-bottom: none; }
      .admin-content { padding: 1.5rem 1.5rem 100px; }
    }
  `
})
export class RestaurantShellPageComponent {
  private readonly profileService = inject(ProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly profile = this.profileService.profile;

  async logout() {
    await this.sessionService.signOut();
    this.profileService.clear();
    await this.router.navigate(['/auth/login']);
  }
}
