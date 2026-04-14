import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { UserRole } from './core/models';
import { ProfileService } from './core/profile.service';
import { SessionService } from './core/session.service';
import { routeByRole } from './core/role-routing';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(
    protected readonly sessionService: SessionService,
    protected readonly profileService: ProfileService,
    private readonly router: Router
  ) {}

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
        return 'Perfil pendiente';
    }
  }

  async logout(): Promise<void> {
    await this.sessionService.signOut();
    this.profileService.clear();
    await this.router.navigateByUrl('/auth/login');
  }
}
