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

      <!-- Page header -->
      <div class="page-header">
        <div class="page-header__left">
          <div class="page-header__icon">⚙️</div>
          <div>
            <h2>Panel de Administración</h2>
            <p>Monitorea métricas, gestiona cuentas y resuelve incidencias de la plataforma.</p>
          </div>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="loadData()" [disabled]="loading">
          @if (loading) {
            <span class="spinner"></span> Actualizando...
          } @else {
            ↻ Recargar datos
          }
        </button>
      </div>

      <!-- Metrics section -->
      <div class="metrics-section">
        <span class="section-label">Métricas en tiempo real</span>
        <div class="metrics-grid">

          <!-- Orders by status -->
          <article class="metric-card">
            <div class="metric-card__header">
              <span class="metric-card__icon orders">📦</span>
              <strong>Pedidos por estado</strong>
            </div>
            @if (!metrics.ordersByStatus.length) {
              <span class="no-data">Sin datos registrados</span>
            } @else {
              <ul class="metric-list">
                @for (item of metrics.ordersByStatus; track item.status) {
                  <li class="metric-list__item">
                    <span [class]="'status-pill ' + orderStatusClass(item.status)">
                      {{ orderStatusLabel(item.status) }}
                    </span>
                    <strong class="metric-count">{{ item.count }}</strong>
                  </li>
                }
              </ul>
            }
          </article>

          <!-- Incidents by status -->
          <article class="metric-card">
            <div class="metric-card__header">
              <span class="metric-card__icon incidents">⚠️</span>
              <strong>Incidencias por estado</strong>
            </div>
            @if (!metrics.incidentsByStatus.length) {
              <span class="no-data">Sin datos registrados</span>
            } @else {
              <ul class="metric-list">
                @for (item of metrics.incidentsByStatus; track item.status) {
                  <li class="metric-list__item">
                    <span [class]="'status-pill ' + incidentStatusClass(item.status)">
                      {{ incidentStatusLabel(item.status) }}
                    </span>
                    <strong class="metric-count">{{ item.count }}</strong>
                  </li>
                }
              </ul>
            }
          </article>

          <!-- Users by role -->
          <article class="metric-card">
            <div class="metric-card__header">
              <span class="metric-card__icon users">👥</span>
              <strong>Usuarios por rol</strong>
            </div>
            @if (!metrics.usersByRole.length) {
              <span class="no-data">Sin datos registrados</span>
            } @else {
              <ul class="metric-list">
                @for (item of metrics.usersByRole; track item.role) {
                  <li class="metric-list__item">
                    <span class="role-chip" [class]="'role-chip--' + item.role">
                      {{ roleLabel(item.role) }}
                    </span>
                    <strong class="metric-count">{{ item.count }}</strong>
                  </li>
                }
              </ul>
            }
          </article>

        </div>
      </div>

      <!-- Main content grid -->
      <div class="content-grid">

        <!-- Users management -->
        <article class="card">
          <div class="card-header">
            <div class="card-header__left">
              <h3>Gestión de usuarios</h3>
              @if (users.length) {
                <span class="count-badge">{{ users.length }}</span>
              }
            </div>
          </div>

          @if (!users.length) {
            <div class="empty-state">
              <span class="empty-state__icon">👤</span>
              <p>No hay usuarios registrados en la plataforma.</p>
            </div>
          } @else {
            <ul class="user-list">
              @for (user of users; track user.auth_user_id) {
                <li class="user-item">
                  <div class="user-item__avatar">
                    {{ initials(user.full_name) }}
                  </div>
                  <div class="user-item__info">
                    <div class="user-item__row">
                      <strong class="user-name">{{ user.full_name }}</strong>
                      <div class="user-item__badges">
                        <span class="role-chip" [class]="'role-chip--' + userRoleFor(user)">
                          {{ roleLabel(userRoleFor(user)) }}
                        </span>
                        <span class="active-badge" [class.inactive]="!userIsActiveFor(user)">
                          {{ userIsActiveFor(user) ? 'Activo' : 'Inactivo' }}
                        </span>
                      </div>
                    </div>
                    <span class="user-email">{{ user.email }}</span>

                    <div class="user-item__controls">
                      <label class="control-label">
                        <span class="label-text">Rol</span>
                        <select
                          [ngModel]="userRoleFor(user)"
                          (ngModelChange)="setUserRoleDraft(user.auth_user_id, $event)"
                        >
                          @for (role of roles; track role) {
                            <option [ngValue]="role">{{ roleLabel(role) }}</option>
                          }
                        </select>
                      </label>

                      <label class="toggle-label">
                        <input
                          type="checkbox"
                          [ngModel]="userIsActiveFor(user)"
                          (ngModelChange)="setUserActiveDraft(user.auth_user_id, $event)"
                          class="toggle-input"
                        />
                        <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        <span class="toggle-text">Cuenta activa</span>
                      </label>

                      <button
                        type="button"
                        class="btn btn--primary btn--xs"
                        (click)="updateUser(user)"
                        [disabled]="updatingUserId === user.auth_user_id"
                      >
                        @if (updatingUserId === user.auth_user_id) {
                          <span class="spinner spinner--white"></span>
                          Guardando...
                        } @else {
                          ✓ Guardar
                        }
                      </button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </article>

        <!-- Incidents management -->
        <article class="card">
          <div class="card-header">
            <div class="card-header__left">
              <h3>Incidencias</h3>
              @if (incidents.length) {
                <span class="count-badge">{{ incidents.length }}</span>
              }
            </div>
          </div>

          @if (!incidents.length) {
            <div class="empty-state">
              <span class="empty-state__icon">✅</span>
              <p>No hay incidencias registradas actualmente.</p>
            </div>
          } @else {
            <ul class="incident-list">
              @for (incident of incidents; track incident.id) {
                <li class="incident-item">
                  <div class="incident-item__header">
                    <div class="incident-item__id">
                      <span class="incident-num">#{{ incident.id }}</span>
                      <span [class]="'status-pill ' + incidentStatusClass(incident.status)">
                        {{ incidentStatusLabel(incident.status) }}
                      </span>
                    </div>
                    <span class="incident-meta">Pedido #{{ incident.order_id }}</span>
                  </div>

                  <strong class="incident-title">{{ incident.title }}</strong>
                  <p class="incident-desc">{{ incident.description }}</p>
                  <span class="incident-reporter">Reportado por: {{ incident.reported_by }}</span>

                  <div class="incident-item__controls">
                    <label class="control-label">
                      <span class="label-text">Cambiar estado</span>
                      <select
                        [ngModel]="incidentStatusFor(incident)"
                        (ngModelChange)="setIncidentStatusDraft(incident.id, $event)"
                      >
                        @for (status of incidentStatuses; track status) {
                          <option [ngValue]="status">{{ incidentStatusLabel(status) }}</option>
                        }
                      </select>
                    </label>
                    <button
                      type="button"
                      class="btn btn--primary btn--xs"
                      (click)="updateIncident(incident)"
                      [disabled]="updatingIncidentId === incident.id"
                    >
                      @if (updatingIncidentId === incident.id) {
                        <span class="spinner spinner--white"></span>
                        Guardando...
                      } @else {
                        ✓ Actualizar
                      }
                    </button>
                  </div>
                </li>
              }
            </ul>
          }
        </article>

      </div>

      @if (message) {
        <div class="alert alert--success">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          {{ message }}
        </div>
      }
      @if (errorMessage) {
        <div class="alert alert--error">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          {{ errorMessage }}
        </div>
      }
    </section>
  `,
  styles: `
    /* ── Page layout ── */
    .page {
      display: grid;
      gap: var(--space-5);
    }

    /* ── Page header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
      padding: var(--space-5);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--surface) 0%, #f5f3ff 100%);
    }

    .page-header__left {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
    }

    .page-header__icon {
      font-size: 1.6rem;
      line-height: 1;
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      background: linear-gradient(145deg, #7c3aed 0%, #6d28d9 100%);
      border-radius: var(--radius-sm);
      display: grid;
      place-items: center;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
    }

    .page-header h2 { font-size: clamp(1.15rem, 1.4vw, 1.45rem); margin: 0; }
    .page-header p { margin: var(--space-1) 0 0; color: var(--muted); font-size: 0.88rem; line-height: 1.5; }

    /* ── Metrics section ── */
    .metrics-section {
      display: grid;
      gap: var(--space-3);
    }

    .section-label {
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
    }

    .metrics-grid {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .metric-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--panel);
      padding: var(--space-4);
      display: grid;
      gap: var(--space-3);
    }

    .metric-card__header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .metric-card__header strong {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--ink);
    }

    .metric-card__icon {
      font-size: 1.2rem;
      line-height: 1;
      width: 2.2rem;
      height: 2.2rem;
      border-radius: var(--radius-xs);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .metric-card__icon.orders   { background: #fff7ed; }
    .metric-card__icon.incidents { background: #fef2f2; }
    .metric-card__icon.users    { background: #f5f3ff; }

    .metric-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-2);
    }

    .metric-list__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    .metric-count {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--ink);
      flex-shrink: 0;
    }

    .no-data {
      font-size: 0.84rem;
      color: var(--muted-2);
      font-style: italic;
    }

    /* ── Content grid ── */
    .content-grid {
      display: grid;
      gap: var(--space-4);
    }

    /* ── Card ── */
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--panel);
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .card-header__left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    h3 { margin: 0; }

    .count-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: var(--primary-soft);
      border: 1px solid var(--primary-muted);
      color: var(--primary-strong);
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border: 0;
      border-radius: 999px;
      padding: 0.55rem 1rem;
      font-weight: 700;
      font-size: 0.88rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn--primary {
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      box-shadow: 0 3px 10px rgba(248, 92, 35, 0.22);
    }

    .btn--primary:hover:not([disabled]) {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(248, 92, 35, 0.3);
    }

    .btn--ghost {
      background: var(--surface-alt);
      border: 1px solid var(--line);
      color: var(--ink);
    }

    .btn--ghost:hover:not([disabled]) {
      border-color: var(--line-strong);
      background: var(--surface);
    }

    .btn--sm { padding: 0.38rem 0.8rem; font-size: 0.82rem; }
    .btn--xs { padding: 0.28rem 0.65rem; font-size: 0.76rem; min-height: auto; }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Role chips ── */
    .role-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      border: 1px solid transparent;
    }

    .role-chip--client     { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .role-chip--restaurant { background: #fef9ee; color: #854d0e; border-color: #fde68a; }
    .role-chip--driver     { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .role-chip--admin      { background: #f5f3ff; color: #5b21b6; border-color: #ddd6fe; }

    /* ── Active badge ── */
    .active-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .active-badge.inactive {
      background: #f8fafc;
      border-color: var(--line);
      color: var(--muted);
    }

    /* ── Status pills ── */
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.18rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }

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
    .status-pill.default    { background: var(--surface); color: var(--muted); border-color: var(--line); }

    /* ── User list ── */
    .user-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }

    .user-item {
      display: grid;
      grid-template-columns: 2.6rem 1fr;
      gap: var(--space-3);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      padding: var(--space-4);
      align-items: start;
    }

    .user-item__avatar {
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 50%;
      background: linear-gradient(145deg, var(--primary-soft) 0%, var(--primary-muted) 100%);
      border: 1.5px solid var(--primary-muted);
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--primary-strong);
      flex-shrink: 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .user-item__info {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }

    .user-item__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .user-name {
      font-size: 0.94rem;
      font-weight: 700;
      color: var(--ink);
    }

    .user-item__badges {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .user-email {
      font-size: 0.82rem;
      color: var(--muted);
      font-weight: 500;
    }

    .user-item__controls {
      display: flex;
      align-items: flex-end;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-top: var(--space-1);
      padding-top: var(--space-3);
      border-top: 1px solid var(--line);
    }

    /* ── Form controls ── */
    .control-label {
      display: grid;
      gap: 0.35rem;
    }

    .label-text {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    select {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0.48rem 0.72rem;
      font: inherit;
      font-size: 0.86rem;
      background: var(--surface);
      color: var(--ink);
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 38px;
    }

    select:hover { border-color: var(--line-strong); }

    select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.12);
    }

    /* ── Toggle switch ── */
    .toggle-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      user-select: none;
    }

    .toggle-input { display: none; }

    .toggle-track {
      width: 2.4rem;
      height: 1.3rem;
      border-radius: 999px;
      background: var(--line-strong);
      position: relative;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .toggle-input:checked + .toggle-track {
      background: var(--success);
    }

    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 0.95rem;
      height: 0.95rem;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    }

    .toggle-input:checked + .toggle-track .toggle-thumb {
      transform: translateX(1.1rem);
    }

    .toggle-text {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    /* ── Incident list ── */
    .incident-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }

    .incident-item {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--surface-alt);
      padding: var(--space-4);
      display: grid;
      gap: var(--space-2);
    }

    .incident-item__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .incident-item__id {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .incident-num {
      font-weight: 800;
      font-size: 0.9rem;
      color: var(--ink);
    }

    .incident-meta {
      font-size: 0.78rem;
      color: var(--muted);
      font-weight: 500;
    }

    .incident-title {
      font-size: 0.94rem;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.3;
    }

    .incident-desc {
      margin: 0;
      font-size: 0.84rem;
      color: var(--muted);
      line-height: 1.5;
    }

    .incident-reporter {
      font-size: 0.78rem;
      color: var(--muted-2);
      font-weight: 500;
    }

    .incident-item__controls {
      display: flex;
      align-items: flex-end;
      gap: var(--space-3);
      flex-wrap: wrap;
      padding-top: var(--space-3);
      border-top: 1px solid var(--line);
      margin-top: var(--space-1);
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) 0;
      text-align: center;
    }

    .empty-state__icon { font-size: 2.5rem; line-height: 1; }
    .empty-state p { margin: 0; color: var(--muted); font-size: 0.9rem; }

    /* ── Spinner ── */
    .spinner {
      width: 0.9rem;
      height: 0.9rem;
      border: 2px solid rgba(100, 60, 30, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      flex-shrink: 0;
    }

    .spinner--white {
      border-color: rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Alerts ── */
    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .alert svg {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }

    .alert--success { background: var(--success-soft); border: 1px solid #a7f3d0; color: #065f46; }
    .alert--error   { background: var(--danger-soft);  border: 1px solid #fecaca; color: var(--danger); }

    /* ── Responsive ── */
    @media (min-width: 900px) {
      .content-grid {
        grid-template-columns: 1fr 1fr;
        align-items: start;
      }
    }
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
