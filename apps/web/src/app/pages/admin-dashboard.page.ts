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
    <!-- Toast -->
    @if (message) {
      <div class="toast success">✓ {{ message }}</div>
    }
    @if (errorMessage) {
      <div class="toast error">✕ {{ errorMessage }}</div>
    }

    <div class="page anim-fade-in">

      <!-- HEADER -->
      <header class="page-header">
        <div class="page-header__icon">⚙️</div>
        <div class="page-header__text">
          <h2>Panel de Administración</h2>
          <p>Monitorea métricas, gestiona cuentas y resuelve incidencias.</p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="loadData()" [disabled]="loading">
          @if (loading) { <span class="spinner"></span> } @else { ↻ }
        </button>
      </header>

      <!-- STATS -->
      <div class="stats-bar anim-slide-up">
        <div class="stat-item">
          <span class="stat-item__val">{{ users.length }}</span>
          <span class="stat-item__label">Usuarios</span>
        </div>
        <div class="stat-item">
          <span class="stat-item__val">{{ totalOrders() }}</span>
          <span class="stat-item__label">Pedidos</span>
        </div>
        <div class="stat-item">
          <span class="stat-item__val">{{ incidents.length }}</span>
          <span class="stat-item__label">Incidencias</span>
        </div>
      </div>

      <!-- METRICS GRID -->
      <div class="metrics-row">

        <article class="metric-card">
          <div class="metric-card__header">
            <span class="metric-icon">📦</span>
            <strong>Pedidos por estado</strong>
          </div>
          @if (!metrics.ordersByStatus.length) {
            <span class="no-data">Sin datos</span>
          } @else {
            <ul class="metric-list">
              @for (item of metrics.ordersByStatus; track item.status) {
                <li class="metric-list__item">
                  <span [class]="'status-pill ' + orderStatusClass(item.status)">{{ orderStatusLabel(item.status) }}</span>
                  <strong class="metric-count">{{ item.count }}</strong>
                </li>
              }
            </ul>
          }
        </article>

        <article class="metric-card">
          <div class="metric-card__header">
            <span class="metric-icon">⚠️</span>
            <strong>Incidencias por estado</strong>
          </div>
          @if (!metrics.incidentsByStatus.length) {
            <span class="no-data">Sin datos</span>
          } @else {
            <ul class="metric-list">
              @for (item of metrics.incidentsByStatus; track item.status) {
                <li class="metric-list__item">
                  <span [class]="'status-pill ' + incidentStatusClass(item.status)">{{ incidentStatusLabel(item.status) }}</span>
                  <strong class="metric-count">{{ item.count }}</strong>
                </li>
              }
            </ul>
          }
        </article>

        <article class="metric-card">
          <div class="metric-card__header">
            <span class="metric-icon">👥</span>
            <strong>Usuarios por rol</strong>
          </div>
          @if (!metrics.usersByRole.length) {
            <span class="no-data">Sin datos</span>
          } @else {
            <ul class="metric-list">
              @for (item of metrics.usersByRole; track item.role) {
                <li class="metric-list__item">
                  <span [class]="'role-chip role-chip--' + item.role">{{ roleLabel(item.role) }}</span>
                  <strong class="metric-count">{{ item.count }}</strong>
                </li>
              }
            </ul>
          }
        </article>

      </div>

      <!-- MAIN GRID: usuarios + incidencias -->
      <div class="content-grid">

        <!-- Usuarios -->
        <article class="card">
          <div class="card-header">
            <h3>Gestión de Usuarios</h3>
            @if (users.length) { <span class="count-badge">{{ users.length }}</span> }
          </div>

          @if (!users.length) {
            <div class="empty-state">
              <span>👤</span>
              <p>No hay usuarios registrados.</p>
            </div>
          } @else {
            <ul class="user-list">
              @for (user of users; track user.auth_user_id) {
                <li class="user-item">
                  <div class="user-avatar">{{ initials(user.full_name) }}</div>
                  <div class="user-body">
                    <div class="user-row">
                      <strong class="user-name">{{ user.full_name }}</strong>
                      <div class="user-badges">
                        <span [class]="'role-chip role-chip--' + userRoleFor(user)">{{ roleLabel(userRoleFor(user)) }}</span>
                        <span class="active-badge" [class.inactive]="!userIsActiveFor(user)">
                          {{ userIsActiveFor(user) ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>
                    <span class="user-email">{{ user.email }}</span>
                    <div class="user-controls">
                      <label class="ctrl-label">
                        <span>Rol</span>
                        <select [ngModel]="userRoleFor(user)" (ngModelChange)="setUserRoleDraft(user.auth_user_id, $event)">
                          @for (role of roles; track role) {
                            <option [ngValue]="role">{{ roleLabel(role) }}</option>
                          }
                        </select>
                      </label>
                      <label class="toggle-label">
                        <input type="checkbox" [ngModel]="userIsActiveFor(user)" (ngModelChange)="setUserActiveDraft(user.auth_user_id, $event)" class="toggle-input" />
                        <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        <span class="toggle-text">Activo</span>
                      </label>
                      <button type="button" class="btn btn--primary btn--sm" (click)="updateUser(user)" [disabled]="updatingUserId === user.auth_user_id">
                        @if (updatingUserId === user.auth_user_id) { <span class="spinner spinner--white"></span> } @else { ✓ Guardar }
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </article>

        <!-- Incidencias -->
        <article class="card">
          <div class="card-header">
            <h3>Incidencias</h3>
            @if (incidents.length) { <span class="count-badge">{{ incidents.length }}</span> }
          </div>

          @if (!incidents.length) {
            <div class="empty-state">
              <span>✅</span>
              <p>No hay incidencias actualmente.</p>
            </div>
          } @else {
            <ul class="incident-list">
              @for (incident of incidents; track incident.id) {
                <li class="incident-item">
                  <div class="incident-header">
                    <div class="incident-id-row">
                      <span class="incident-num">#{{ incident.id }}</span>
                      <span [class]="'status-pill ' + incidentStatusClass(incident.status)">{{ incidentStatusLabel(incident.status) }}</span>
                    </div>
                    <span class="incident-ref">Pedido #{{ incident.order_id }}</span>
                  </div>
                  <strong class="incident-title">{{ incident.title }}</strong>
                  <p class="incident-desc">{{ incident.description }}</p>
                  <div class="incident-controls">
                    <label class="ctrl-label">
                      <span>Estado</span>
                      <select [ngModel]="incidentStatusFor(incident)" (ngModelChange)="setIncidentStatusDraft(incident.id, $event)">
                        @for (status of incidentStatuses; track status) {
                          <option [ngValue]="status">{{ incidentStatusLabel(status) }}</option>
                        }
                      </select>
                    </label>
                    <button type="button" class="btn btn--primary btn--sm" (click)="updateIncident(incident)" [disabled]="updatingIncidentId === incident.id">
                      @if (updatingIncidentId === incident.id) { <span class="spinner spinner--white"></span> } @else { ✓ Actualizar }
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </article>

      </div>
    </div>
  `,
  styles: `
    /* ── Layout ── */
    .page { display: grid; gap: 2rem; padding: 1.5rem; }

    /* ── Toast ── */
    .toast { position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 9999; padding: 0.9rem 1.8rem; border-radius: 99px; font-weight: 800; font-size: 0.9rem; white-space: nowrap; display: flex; align-items: center; gap: 0.6rem; box-shadow: 0 8px 30px rgba(0,0,0,0.15); animation: toastIn 0.35s cubic-bezier(0.16,1,0.3,1); }
    .toast.success { background: #16a34a; color: white; }
    .toast.error   { background: #dc2626; color: white; }
    @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    /* ── Header ── */
    .page-header { display: flex; align-items: center; gap: 1.5rem; }
    .page-header__icon { font-size: 2.5rem; flex-shrink: 0; }
    .page-header__text { flex: 1; }
    .page-header h2 { font-size: 1.8rem; font-weight: 900; margin: 0; }
    .page-header p  { margin: 0; color: #666; font-size: 0.9rem; }

    /* ── Stats bar ── */
    .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .stat-item { background: white; padding: 1.5rem; border-radius: 24px; border: 1.5px solid var(--line); display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .stat-item__val   { font-size: 1.8rem; font-weight: 900; color: #000; }
    .stat-item__label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }

    /* ── Metrics row ── */
    .metrics-row { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .metric-card { border: 1.5px solid var(--line); border-radius: 24px; background: white; padding: 1.5rem; display: grid; gap: 1rem; }
    .metric-card__header { display: flex; align-items: center; gap: 0.75rem; }
    .metric-card__header strong { font-size: 0.9rem; font-weight: 800; }
    .metric-icon { font-size: 1.3rem; width: 2.2rem; height: 2.2rem; background: #f7f7f7; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
    .metric-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
    .metric-list__item { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .metric-count { font-size: 1.1rem; font-weight: 900; color: #000; }
    .no-data { font-size: 0.82rem; color: #aaa; font-style: italic; }

    /* ── Content grid ── */
    .content-grid { display: grid; gap: 1.5rem; }
    @media (min-width: 900px) { .content-grid { grid-template-columns: 1fr 1fr; align-items: start; } }

    /* ── Cards ── */
    .card { border: 1.5px solid var(--line); border-radius: 28px; background: white; padding: 2rem; display: grid; gap: 1.5rem; }
    .card-header { display: flex; align-items: center; gap: 0.75rem; }
    .card-header h3 { font-size: 1.15rem; font-weight: 850; margin: 0; flex: 1; }
    .count-badge { padding: 0.2rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; background: #f7f7f7; border: 1.5px solid var(--line); }

    /* ── Buttons ── */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border: 0; border-radius: 99px; font-weight: 800; font-family: inherit; cursor: pointer; transition: 0.2s; }
    .btn--primary { background: var(--primary); color: white; padding: 0.65rem 1.2rem; font-size: 0.85rem; }
    .btn--primary:hover:not([disabled]) { box-shadow: 0 4px 14px rgba(255,68,31,0.3); transform: translateY(-1px); }
    .btn--ghost { background: transparent; border: 1.5px solid var(--line); color: #555; padding: 0.5rem 1rem; font-size: 0.85rem; }
    .btn--sm { padding: 0.55rem 1rem; font-size: 0.82rem; }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Role chips ── */
    .role-chip { display: inline-flex; align-items: center; padding: 0.22rem 0.65rem; border-radius: 99px; font-size: 0.72rem; font-weight: 800; border: 1.5px solid transparent; }
    .role-chip--client     { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .role-chip--restaurant { background: #fefce8; color: #854d0e; border-color: #fde68a; }
    .role-chip--driver     { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .role-chip--admin      { background: #f5f3ff; color: #5b21b6; border-color: #ddd6fe; }

    /* ── Active badge ── */
    .active-badge { display: inline-flex; align-items: center; padding: 0.22rem 0.65rem; border-radius: 99px; font-size: 0.7rem; font-weight: 800; background: #f0fdf4; border: 1.5px solid #bbf7d0; color: #166534; }
    .active-badge.inactive { background: #f8f8f8; border-color: var(--line); color: #999; }

    /* ── Status pills ── */
    .status-pill { display: inline-flex; align-items: center; padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; border: 1.5px solid transparent; }
    .status-pill.pending    { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .status-pill.accepted   { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-pill.ready      { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
    .status-pill.assigned   { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .status-pill.in-transit { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
    .status-pill.delivered  { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
    .status-pill.rejected   { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .status-pill.cancelled  { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .status-pill.open       { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .status-pill.in-review  { background: #faf5ff; color: #6b21a8; border-color: #e9d5ff; }
    .status-pill.resolved   { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-pill.closed     { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .status-pill.default    { background: #f7f7f7; color: #888; border-color: var(--line); }

    /* ── User list ── */
    .user-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
    .user-item { display: grid; grid-template-columns: 2.8rem 1fr; gap: 1rem; border: 1.5px solid var(--line); border-radius: 20px; background: #fafafa; padding: 1.2rem; align-items: start; }
    .user-avatar { width: 2.8rem; height: 2.8rem; border-radius: 50%; background: #FFF0ED; border: 2px solid #ffd4c8; display: grid; place-items: center; font-size: 0.82rem; font-weight: 900; color: var(--primary); text-transform: uppercase; flex-shrink: 0; }
    .user-body { display: grid; gap: 0.4rem; min-width: 0; }
    .user-row  { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .user-name  { font-size: 0.95rem; font-weight: 800; color: #000; }
    .user-badges { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; flex-shrink: 0; }
    .user-email { font-size: 0.8rem; color: #888; font-weight: 600; }
    .user-controls { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1.5px solid var(--line); margin-top: 0.25rem; }

    /* ── Form controls ── */
    .ctrl-label { display: grid; gap: 0.3rem; }
    .ctrl-label span { font-size: 0.75rem; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    select { border: 1.5px solid var(--line); border-radius: 12px; padding: 0.5rem 0.8rem; font: inherit; font-size: 0.85rem; background: white; color: #000; transition: border-color 0.15s, box-shadow 0.15s; min-height: 40px; }
    select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(255,68,31,0.12); }

    /* ── Toggle ── */
    .toggle-label { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; user-select: none; }
    .toggle-input { display: none; }
    .toggle-track { width: 2.4rem; height: 1.3rem; border-radius: 99px; background: #ddd; position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-input:checked + .toggle-track { background: #22c55e; }
    .toggle-thumb { position: absolute; top: 2px; left: 2px; width: 0.95rem; height: 0.95rem; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
    .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(1.1rem); }
    .toggle-text { font-size: 0.82rem; font-weight: 700; color: #555; }

    /* ── Incident list ── */
    .incident-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
    .incident-item { border: 1.5px solid var(--line); border-radius: 20px; background: #fafafa; padding: 1.2rem; display: grid; gap: 0.6rem; }
    .incident-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .incident-id-row { display: flex; align-items: center; gap: 0.5rem; }
    .incident-num { font-weight: 900; font-size: 0.9rem; color: #000; }
    .incident-ref { font-size: 0.78rem; color: #999; font-weight: 600; }
    .incident-title { font-size: 0.92rem; font-weight: 800; color: #000; }
    .incident-desc { margin: 0; font-size: 0.82rem; color: #777; line-height: 1.5; }
    .incident-controls { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1.5px solid var(--line); margin-top: 0.1rem; }

    /* ── Empty state ── */
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem 0; text-align: center; }
    .empty-state span { font-size: 2.5rem; }
    .empty-state p { margin: 0; color: #999; font-size: 0.9rem; }

    /* ── Spinner ── */
    .spinner { width: 1rem; height: 1rem; border: 2px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
    .spinner--white { border-color: rgba(255,255,255,0.3); border-top-color: white; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Animations ── */
    .anim-fade-in  { animation: fadeIn  0.4s ease both; }
    .anim-slide-up { animation: slideUp 0.4s ease both; }
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
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

  protected totalOrders(): number {
    return this.metrics.ordersByStatus.reduce((sum, item) => sum + Number(item.count), 0);
  }

  protected initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('');
  }

  protected roleLabel(role: string): string {
    const map: Record<string, string> = {
      client: 'Cliente',
      driver: 'Repartidor',
      restaurant: 'Restaurante',
      admin: 'Administrador'
    };
    return map[role] ?? role;
  }

  protected orderStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptado',
      REJECTED: 'Rechazado',
      READY_FOR_PICKUP: 'Listo',
      ASSIGNED: 'Asignado',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado'
    };
    return map[status] ?? status;
  }

  protected orderStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'pending',
      ACCEPTED: 'accepted',
      REJECTED: 'rejected',
      READY_FOR_PICKUP: 'ready',
      ASSIGNED: 'assigned',
      IN_TRANSIT: 'in-transit',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled'
    };
    return map[status] ?? 'default';
  }

  protected incidentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'Abierta',
      IN_REVIEW: 'En revisión',
      RESOLVED: 'Resuelta',
      CLOSED: 'Cerrada'
    };
    return map[status] ?? status;
  }

  protected incidentStatusClass(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'open',
      IN_REVIEW: 'in-review',
      RESOLVED: 'resolved',
      CLOSED: 'closed'
    };
    return map[status] ?? 'default';
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
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar información.');
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
      const updated = await this.apiService.updateAdminUser(user.auth_user_id, { role, isActive });

      const index = this.users.findIndex((item) => item.auth_user_id === updated.auth_user_id);
      if (index >= 0) this.users[index] = updated;

      this.userRoleDrafts[updated.auth_user_id] = updated.role;
      this.userActiveDrafts[updated.auth_user_id] = updated.is_active;
      this.message = `Usuario ${updated.full_name} actualizado correctamente.`;
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
      this.message = `Incidencia #${updated.id} actualizada a ${this.incidentStatusLabel(updated.status)}.`;
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
