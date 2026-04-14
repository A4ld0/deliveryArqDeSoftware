import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { AdminMetrics, AdminUser, IncidentItem, UserRole } from '../core/models';

const INCIDENT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const;
type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <h2>Modulo Admin</h2>
      <p>Gestion operativa de usuarios, incidencias y metricas base.</p>

      <div class="toolbar">
        <button type="button" (click)="loadData()" [disabled]="loading">
          {{ loading ? 'Cargando...' : 'Recargar datos' }}
        </button>
      </div>

      <div class="grid">
        <article class="card">
          <h3>Metricas</h3>

          <div class="metrics-grid">
            <div class="metric">
              <strong>Pedidos por estado</strong>
              @if (!metrics.ordersByStatus.length) {
                <span class="muted">Sin datos</span>
              } @else {
                <ul>
                  @for (item of metrics.ordersByStatus; track item.status) {
                    <li>
                      <span>{{ item.status }}</span>
                      <strong>{{ item.count }}</strong>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="metric">
              <strong>Incidencias por estado</strong>
              @if (!metrics.incidentsByStatus.length) {
                <span class="muted">Sin datos</span>
              } @else {
                <ul>
                  @for (item of metrics.incidentsByStatus; track item.status) {
                    <li>
                      <span>{{ item.status }}</span>
                      <strong>{{ item.count }}</strong>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="metric">
              <strong>Usuarios por rol</strong>
              @if (!metrics.usersByRole.length) {
                <span class="muted">Sin datos</span>
              } @else {
                <ul>
                  @for (item of metrics.usersByRole; track item.role) {
                    <li>
                      <span>{{ item.role }}</span>
                      <strong>{{ item.count }}</strong>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
        </article>

        <article class="card">
          <h3>Usuarios</h3>
          @if (!users.length) {
            <p class="muted">Sin usuarios para mostrar.</p>
          } @else {
            <ul class="list">
              @for (user of users; track user.auth_user_id) {
                <li>
                  <div class="row">
                    <strong>{{ user.full_name }}</strong>
                    <span>{{ user.email }}</span>
                  </div>
                  <div class="inline">
                    <label>
                      Rol
                      <select
                        [ngModel]="userRoleFor(user)"
                        (ngModelChange)="setUserRoleDraft(user.auth_user_id, $event)"
                      >
                        @for (role of roles; track role) {
                          <option [ngValue]="role">{{ role }}</option>
                        }
                      </select>
                    </label>

                    <label class="checkbox">
                      <input
                        type="checkbox"
                        [ngModel]="userIsActiveFor(user)"
                        (ngModelChange)="setUserActiveDraft(user.auth_user_id, $event)"
                      />
                      Activo
                    </label>
                  </div>
                  <button
                    type="button"
                    (click)="updateUser(user)"
                    [disabled]="updatingUserId === user.auth_user_id"
                  >
                    {{ updatingUserId === user.auth_user_id ? 'Guardando...' : 'Guardar usuario' }}
                  </button>
                </li>
              }
            </ul>
          }
        </article>

        <article class="card">
          <h3>Incidencias</h3>
          @if (!incidents.length) {
            <p class="muted">Sin incidencias registradas.</p>
          } @else {
            <ul class="list">
              @for (incident of incidents; track incident.id) {
                <li>
                  <div class="row">
                    <strong>#{{ incident.id }} - Pedido #{{ incident.order_id }}</strong>
                    <span>Por: {{ incident.reported_by }}</span>
                  </div>
                  <strong>{{ incident.title }}</strong>
                  <span>{{ incident.description }}</span>
                  <div class="inline">
                    <label>
                      Estado
                      <select
                        [ngModel]="incidentStatusFor(incident)"
                        (ngModelChange)="setIncidentStatusDraft(incident.id, $event)"
                      >
                        @for (status of incidentStatuses; track status) {
                          <option [ngValue]="status">{{ status }}</option>
                        }
                      </select>
                    </label>

                    <button
                      type="button"
                      (click)="updateIncident(incident)"
                      [disabled]="updatingIncidentId === incident.id"
                    >
                      {{ updatingIncidentId === incident.id ? 'Guardando...' : 'Actualizar estado' }}
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </article>
      </div>

      @if (message) {
        <p class="message">{{ message }}</p>
      }
      @if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
      }
    </section>
  `,
  styles: `
    .page { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1.25rem; }
    p { color: var(--muted); }
    .toolbar { margin-top: 0.7rem; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
    }
    .grid { margin-top: 1rem; display: grid; gap: 0.8rem; }
    .card { border: 1px solid var(--line); border-radius: 12px; padding: 0.8rem; background: var(--panel); }
    .metrics-grid { display: grid; gap: 0.7rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .metric { border: 1px solid var(--line); background: var(--surface); border-radius: 10px; padding: 0.55rem; display: grid; gap: 0.4rem; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
    .metric li { display: flex; justify-content: space-between; gap: 0.5rem; }
    .list { margin-top: 0.7rem; }
    .list li { border: 1px solid var(--line); border-radius: 10px; padding: 0.5rem 0.55rem; background: var(--surface); display: grid; gap: 0.3rem; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .inline { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; color: #334155; }
    select {
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      padding: 0.35rem 0.5rem;
      font: inherit;
      background: var(--surface);
    }
    .checkbox { display: flex; align-items: center; gap: 0.35rem; }
    .muted { color: var(--muted); font-size: 0.9rem; }
    .message { color: var(--primary); font-weight: 600; margin-top: 0.9rem; }
    .error { color: var(--danger); font-weight: 600; margin-top: 0.9rem; }
  `
})
export class AdminDashboardPageComponent {
  protected readonly roles: UserRole[] = ['client', 'driver', 'restaurant', 'admin'];
  protected readonly incidentStatuses: IncidentStatus[] = [...INCIDENT_STATUSES];

  protected users: AdminUser[] = [];
  protected incidents: IncidentItem[] = [];
  protected metrics: AdminMetrics = {
    ordersByStatus: [],
    incidentsByStatus: [],
    usersByRole: []
  };

  protected loading = false;
  protected updatingUserId: string | null = null;
  protected updatingIncidentId: number | null = null;
  protected message = '';
  protected errorMessage = '';

  protected userRoleDrafts: Record<string, UserRole> = {};
  protected userActiveDrafts: Record<string, boolean> = {};
  protected incidentStatusDrafts: Record<number, IncidentStatus> = {};

  constructor(private readonly apiService: ApiService) {
    void this.loadData();
  }

  protected async loadData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [users, incidents, metrics] = await Promise.all([
        this.apiService.getAdminUsers(),
        this.apiService.getIncidents(),
        this.apiService.getAdminMetrics()
      ]);
      this.users = users;
      this.incidents = incidents;
      this.metrics = metrics;

      this.userRoleDrafts = {};
      this.userActiveDrafts = {};
      this.incidentStatusDrafts = {};

      for (const user of users) {
        this.userRoleDrafts[user.auth_user_id] = user.role;
        this.userActiveDrafts[user.auth_user_id] = user.is_active;
      }
      for (const incident of incidents) {
        this.incidentStatusDrafts[incident.id] = this.normalizeIncidentStatus(incident.status);
      }
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar informacion.');
    } finally {
      this.loading = false;
    }
  }

  protected userRoleFor(user: AdminUser): UserRole {
    return this.userRoleDrafts[user.auth_user_id] ?? user.role;
  }

  protected userIsActiveFor(user: AdminUser): boolean {
    return this.userActiveDrafts[user.auth_user_id] ?? user.is_active;
  }

  protected setUserRoleDraft(authUserId: string, role: unknown): void {
    const normalized = this.roles.find((item) => item === role);
    if (!normalized) return;
    this.userRoleDrafts[authUserId] = normalized;
  }

  protected setUserActiveDraft(authUserId: string, isActive: unknown): void {
    this.userActiveDrafts[authUserId] = Boolean(isActive);
  }

  protected incidentStatusFor(incident: IncidentItem): IncidentStatus {
    return (
      this.incidentStatusDrafts[incident.id] ?? this.normalizeIncidentStatus(incident.status)
    );
  }

  protected setIncidentStatusDraft(incidentId: number, status: unknown): void {
    this.incidentStatusDrafts[incidentId] = this.normalizeIncidentStatus(
      typeof status === 'string' ? status : 'OPEN'
    );
  }

  protected async updateUser(user: AdminUser): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.updatingUserId = user.auth_user_id;

    try {
      const role = this.userRoleFor(user);
      const isActive = this.userIsActiveFor(user);
      const updated = await this.apiService.updateAdminUser(user.auth_user_id, {
        role,
        isActive
      });

      const index = this.users.findIndex((item) => item.auth_user_id === updated.auth_user_id);
      if (index >= 0) this.users[index] = updated;

      this.userRoleDrafts[updated.auth_user_id] = updated.role;
      this.userActiveDrafts[updated.auth_user_id] = updated.is_active;
      this.message = `Usuario ${updated.full_name} actualizado.`;
      this.metrics = await this.apiService.getAdminMetrics();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar el usuario.');
    } finally {
      this.updatingUserId = null;
    }
  }

  protected async updateIncident(incident: IncidentItem): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.updatingIncidentId = incident.id;

    try {
      const status = this.incidentStatusFor(incident);
      const updated = await this.apiService.updateIncidentStatus(incident.id, status);
      const index = this.incidents.findIndex((item) => item.id === updated.id);
      if (index >= 0) this.incidents[index] = updated;

      this.incidentStatusDrafts[updated.id] = this.normalizeIncidentStatus(updated.status);
      this.message = `Incidencia #${updated.id} actualizada a ${updated.status}.`;
      this.metrics = await this.apiService.getAdminMetrics();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar la incidencia.');
    } finally {
      this.updatingIncidentId = null;
    }
  }

  private normalizeIncidentStatus(value: string): IncidentStatus {
    return INCIDENT_STATUSES.find((status) => status === value) ?? 'OPEN';
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string; details?: unknown } | null;
      if (payload?.error) return payload.error;
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }
    if (error instanceof Error) return error.message;
    return fallback;
  }
}
