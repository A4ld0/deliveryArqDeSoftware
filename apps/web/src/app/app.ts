import { Component, OnInit, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { UserRole } from './core/models';
import { ProfileService } from './core/profile.service';
import { SessionService } from './core/session.service';
import { routeByRole } from './core/role-routing';

import { SearchService } from './core/search.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly profileService = inject(ProfileService);
  protected readonly sessionService = inject(SessionService);
  protected readonly searchService = inject(SearchService);
  private readonly router = inject(Router);

  protected readonly profile = this.profileService.profile;
  protected readonly isFullWidthShell = computed(() => {
    const p = this.profile();
    return p?.role === 'restaurant' || p?.role === 'driver';
  });

  async ngOnInit() {
    await this.profileService.ensureLoaded();
    this.updateTitle();
  }

  private updateTitle(): void {
    const p = this.profile();
    let title = 'E4';
    if (p?.role === 'restaurant') title = 'E4 - Business';
    if (p?.role === 'driver') title = 'E4 - Delivery';
    
    // Set document title
    document.title = title;
  }

  protected moduleRoute(role: UserRole): string {
    return routeByRole(role);
  }

  protected roleLabel(role: UserRole | null | undefined): string {
    switch (role) {
      case 'client':
        return 'Cliente';
      case 'restaurant':
        return 'Restaurante';
      case 'driver':
        return 'Entregador';
      case 'admin':
        return 'Administrador';
      default:
        return '';
    }
  }

  async logout(): Promise<void> {
    await this.sessionService.signOut();
    this.profileService.clear();
    await this.router.navigateByUrl('/auth/login');
  }
}
