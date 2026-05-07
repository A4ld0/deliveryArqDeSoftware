import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { AdminMetrics, AdminUser, IncidentItem, StatusCount, UserRole } from '../core/models';

const INCIDENT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const;
type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-page anim-fade-in">
      <header class="admin-hero">
        <div class="admin-hero__content">
          <span class="eyebrow">Panel administrativo</span>
          <h2>Centro de control E4</h2>
          <p>
            Supervisa usuarios, pedidos e incidencias desde una vista limpia y consistente con la plataforma.
          </p>
        </div>

        <div class="admin-hero__actions">
          <button type="button" class="refresh-action" (click)="loadData()" [disabled]="loading">
            @if (loading) {
              <span class="spinner"></span>
              Actualizando
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
                <path d="M21 3v6h-6"/>
              </svg>
              Recargar
            }
          </button>
        </div>
      </header>

      @if (message) {
        <div class="notice notice--success">
          <span class="notice__dot"></span>
          {{ message }}
        </div>
      }
      @if (errorMessage) {
        <div class="notice notice--error">
          <span class="notice__dot"></span>
          {{ errorMessage }}
        </div>
      }

      <section class="summary-grid" aria-label="Resumen administrativo">
        <article class="summary-card summary-card--orders">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <span class="summary-label">Pedidos monitoreados</span>
            <strong class="summary-value">{{ totalCount(metrics.ordersByStatus) }}</strong>
          </div>
          <div class="summary-breakdown">
            @for (item of metrics.ordersByStatus; track item.status) {
              <span [class]="'mini-pill ' + orderStatusClass(item.status)">
                {{ orderStatusLabel(item.status) }}: {{ item.count }}
              </span>
            } @empty {
              <span class="muted-copy">Sin datos todavia</span>
            }
          </div>
        </article>

        <article class="summary-card summary-card--incidents">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <path d="M12 7v4"/>
              <path d="M12 14h.01"/>
            </svg>
          </div>
          <div>
            <span class="summary-label">Incidencias abiertas</span>
            <strong class="summary-value">{{ openIncidentCount() }}</strong>
          </div>
          <div class="summary-breakdown">
            @for (item of metrics.incidentsByStatus; track item.status) {
              <span [class]="'mini-pill ' + incidentStatusClass(item.status)">
                {{ incidentStatusLabel(item.status) }}: {{ item.count }}
              </span>
            } @empty {
              <span class="muted-copy">Operacion sin incidencias</span>
            }
          </div>
        </article>

        <article class="summary-card summary-card--users">
          <div class="summary-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <span class="summary-label">Usuarios activos</span>
            <strong class="summary-value">{{ activeUsersCount() }}</strong>
          </div>
          <div class="summary-breakdown">
            @for (item of metrics.usersByRole; track item.role) {
              <span [class]="'role-mini role-mini--' + item.role">
                {{ roleLabel(item.role) }}: {{ item.count }}
              </span>
            } @empty {
              <span class="muted-copy">Sin usuarios registrados</span>
            }
          </div>
        </article>
      </section>

      <section class="admin-workspace">
        <article class="panel panel--users">
          <header class="panel-header">
            <div>
              <span class="panel-kicker">Cuentas</span>
              <h3>Gestion de usuarios</h3>
              <p>Administra roles y acceso sin salir del panel.</p>
            </div>
            <span class="panel-count">{{ users.length }} registros</span>
          </header>

          @if (!users.length) {
            <div class="empty-state">
              <span class="empty-state__badge">US</span>
              <h4>No hay usuarios registrados</h4>
              <p>Cuando se creen cuentas, apareceran aqui para administrarlas.</p>
            </div>
          } @else {
            <div class="user-grid">
              @for (user of users; track user.auth_user_id) {
                <article class="user-card">
                  <div class="user-card__top">
                    <div class="avatar-ring">{{ initials(user.full_name) }}</div>
                    <div class="user-card__identity">
                      <strong>{{ user.full_name }}</strong>
                      <span>{{ user.email }}</span>
                    </div>
                    <div class="user-card__badges">
                      <span [class]="'role-chip role-chip--' + userRoleFor(user)">
                        {{ roleLabel(userRoleFor(user)) }}
                      </span>
                      <span class="active-badge" [class.active-badge--inactive]="!userIsActiveFor(user)">
                        {{ userIsActiveFor(user) ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                  </div>

                  <dl class="user-meta">
                    <div>
                      <dt>Telefono</dt>
                      <dd>{{ user.phone || 'Sin telefono' }}</dd>
                    </div>
                    <div>
                      <dt>Direccion</dt>
                      <dd>{{ user.address || 'Sin direccion' }}</dd>
                    </div>
                  </dl>

                  <div class="control-strip">
                    <label class="field-control">
                      <span>Rol</span>
                      <select
                        [ngModel]="userRoleFor(user)"
                        (ngModelChange)="setUserRoleDraft(user.auth_user_id, $event)"
                      >
                        @for (role of roles; track role) {
                          <option [ngValue]="role">{{ roleLabel(role) }}</option>
                        }
                      </select>
                    </label>

                    <label class="switch-control">
                      <input
                        type="checkbox"
                        [ngModel]="userIsActiveFor(user)"
                        (ngModelChange)="setUserActiveDraft(user.auth_user_id, $event)"
                      />
                      <span class="switch-track"><span></span></span>
                      <em>Cuenta activa</em>
                    </label>

                    <button
                      type="button"
                      class="save-action"
                      (click)="updateUser(user)"
                      [disabled]="updatingUserId === user.auth_user_id"
                    >
                      @if (updatingUserId === user.auth_user_id) {
                        <span class="spinner spinner--white"></span>
                        Guardando
                      } @else {
                        Guardar cambios
                      }
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </article>

        <article class="panel panel--incidents">
          <header class="panel-header">
            <div>
              <span class="panel-kicker">Soporte</span>
              <h3>Incidencias reportadas</h3>
              <p>Prioriza, revisa y cierra reportes de clientes.</p>
            </div>
            <span class="panel-count">{{ incidents.length }} reportes</span>
          </header>

          @if (!incidents.length) {
            <div class="empty-state">
              <span class="empty-state__badge">OK</span>
              <h4>Todo en orden</h4>
              <p>No hay incidencias registradas actualmente.</p>
            </div>
          } @else {
            <div class="incident-stack">
              @for (incident of incidents; track incident.id) {
                <article class="incident-card">
                  <header class="incident-card__header">
                    <div>
                      <span class="incident-number">Incidencia #{{ incident.id }}</span>
                      <strong>{{ incident.title }}</strong>
                    </div>
                    <span [class]="'status-pill ' + incidentStatusClass(incident.status)">
                      {{ incidentStatusLabel(incident.status) }}
                    </span>
                  </header>

                  <p>{{ incident.description }}</p>

                  <div class="incident-meta-grid">
                    <span>Pedido #{{ incident.order_id }}</span>
                    <span>Reportado por {{ incident.reported_by }}</span>
                  </div>

                  <div class="incident-actions">
                    <label class="field-control">
                      <span>Nuevo estado</span>
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
                      class="save-action save-action--compact"
                      (click)="updateIncident(incident)"
                      [disabled]="updatingIncidentId === incident.id"
                    >
                      @if (updatingIncidentId === incident.id) {
                        <span class="spinner spinner--white"></span>
                        Actualizando
                      } @else {
                        Actualizar
                      }
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </article>
      </section>
    </section>
  `,
  styles: `
    .admin-page {
      --admin-bg: #f7f7f7;
      --admin-surface: #ffffff;
      --admin-surface-soft: #fff7f2;
      --admin-ink: #12100f;
      --admin-muted: #74645d;
      --admin-line: #ead8cd;
      --admin-line-strong: #f1bba1;
      --admin-primary: var(--primary, #ff441f);
      --admin-primary-strong: var(--primary-strong, #e63916);
      --admin-shadow: 0 22px 70px rgba(84, 50, 30, 0.12);
      display: grid;
      gap: 1.5rem;
      color: var(--admin-ink);
    }

    .admin-hero,
    .summary-card,
    .panel,
    .notice {
      border: 1px solid var(--admin-line);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--admin-shadow);
    }

    .admin-hero {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      align-items: center;
      padding: clamp(1.5rem, 3vw, 2.25rem);
      border-radius: 32px;
      background:
        radial-gradient(circle at top right, rgba(255, 68, 31, 0.22), transparent 34%),
        linear-gradient(135deg, #ffffff 0%, #fff4ec 100%);
      overflow: hidden;
      position: relative;
    }

    .admin-hero::after {
      content: '';
      position: absolute;
      width: 15rem;
      height: 15rem;
      right: -7rem;
      bottom: -8rem;
      border-radius: 50%;
      border: 38px solid rgba(255, 68, 31, 0.08);
      pointer-events: none;
    }

    .admin-hero__content { max-width: 720px; position: relative; z-index: 1; }
    .eyebrow,
    .panel-kicker {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 0.38rem 0.75rem;
      border-radius: 99px;
      background: #fff0ed;
      color: var(--admin-primary-strong);
      border: 1px solid #ffd4c7;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .admin-hero h2 {
      margin: 0.8rem 0 0;
      font-size: clamp(2rem, 4vw, 3.8rem);
      line-height: 0.98;
      letter-spacing: -0.06em;
    }

    .admin-hero p {
      margin: 1rem 0 0;
      color: var(--admin-muted);
      max-width: 680px;
      font-size: clamp(1rem, 1.5vw, 1.18rem);
      line-height: 1.55;
      font-weight: 650;
    }

    .admin-hero__actions { position: relative; z-index: 1; display: flex; align-items: center; }

    .refresh-action,
    .save-action {
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      font-weight: 900;
      font-size: 0.94rem;
      min-height: 48px;
      padding: 0.85rem 1.25rem;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
    }

    .refresh-action {
      color: var(--admin-ink);
      background: #ffffff;
      border: 1.5px solid var(--admin-line-strong);
    }

    .refresh-action svg { width: 1.1rem; height: 1.1rem; }
    .refresh-action:hover:not(:disabled),
    .save-action:hover:not(:disabled) { transform: translateY(-2px); }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }

    .summary-card {
      min-height: 220px;
      border-radius: 28px;
      padding: 1.35rem;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 1rem;
      align-content: start;
      position: relative;
      overflow: hidden;
    }

    .summary-card::after {
      content: '';
      position: absolute;
      inset: auto -3rem -4rem auto;
      width: 10rem;
      height: 10rem;
      border-radius: 999px;
      background: rgba(255, 68, 31, 0.08);
    }

    .summary-card__icon {
      width: 3.2rem;
      height: 3.2rem;
      border-radius: 20px;
      display: grid;
      place-items: center;
      color: #ffffff;
      background: var(--admin-ink);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.14);
    }

    .summary-card__icon svg { width: 1.35rem; height: 1.35rem; }
    .summary-card--orders .summary-card__icon { background: var(--admin-primary); }
    .summary-card--incidents .summary-card__icon { background: #b91c1c; }
    .summary-card--users .summary-card__icon { background: #0f766e; }

    .summary-label,
    .panel-count,
    .muted-copy {
      color: var(--admin-muted);
      font-size: 0.82rem;
      font-weight: 800;
    }

    .summary-value {
      display: block;
      margin-top: 0.1rem;
      font-size: 2.65rem;
      line-height: 1;
      letter-spacing: -0.06em;
    }

    .summary-breakdown {
      grid-column: 1 / -1;
      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.45rem;
      position: relative;
      z-index: 1;
    }

    .mini-pill,
    .role-mini,
    .role-chip,
    .status-pill,
    .active-badge {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border: 1px solid transparent;
      border-radius: 999px;
      white-space: nowrap;
      font-weight: 900;
    }

    .mini-pill,
    .role-mini {
      padding: 0.28rem 0.62rem;
      font-size: 0.72rem;
    }

    .admin-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
      gap: 1rem;
      align-items: start;
    }

    .panel {
      border-radius: 32px;
      padding: clamp(1.25rem, 2vw, 1.75rem);
      display: grid;
      gap: 1.15rem;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--admin-line);
    }

    .panel-header h3 {
      margin: 0.7rem 0 0;
      font-size: clamp(1.35rem, 2vw, 1.75rem);
      letter-spacing: -0.04em;
    }

    .panel-header p {
      margin: 0.35rem 0 0;
      color: var(--admin-muted);
      font-weight: 650;
    }

    .panel-count {
      border: 1px solid var(--admin-line);
      background: #fffaf7;
      padding: 0.5rem 0.8rem;
      border-radius: 999px;
      flex-shrink: 0;
    }

    .user-grid,
    .incident-stack {
      display: grid;
      gap: 0.9rem;
    }

    .user-card,
    .incident-card {
      border: 1px solid var(--admin-line);
      border-radius: 26px;
      background: linear-gradient(180deg, #ffffff 0%, #fffaf7 100%);
      padding: 1rem;
    }

    .user-card__top {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: 0.9rem;
    }

    .avatar-ring {
      width: 3rem;
      height: 3rem;
      border-radius: 18px;
      display: grid;
      place-items: center;
      color: var(--admin-primary-strong);
      background: #fff0ed;
      border: 1.5px solid #ffd4c7;
      font-weight: 950;
      letter-spacing: -0.04em;
    }

    .user-card__identity { display: grid; min-width: 0; }
    .user-card__identity strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 1rem;
    }
    .user-card__identity span {
      color: var(--admin-muted);
      font-size: 0.82rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-card__badges {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .role-chip,
    .active-badge,
    .status-pill {
      padding: 0.26rem 0.62rem;
      font-size: 0.7rem;
    }

    .role-chip--client,
    .role-mini--client { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .role-chip--restaurant,
    .role-mini--restaurant { background: #fef9ee; color: #854d0e; border-color: #fde68a; }
    .role-chip--driver,
    .role-mini--driver { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .role-chip--admin,
    .role-mini--admin { background: #f5f3ff; color: #5b21b6; border-color: #ddd6fe; }

    .active-badge { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .active-badge--inactive { background: #f8fafc; color: #64748b; border-color: #cbd5e1; }

    .user-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin: 1rem 0 0;
    }

    .user-meta div {
      border: 1px solid var(--admin-line);
      border-radius: 18px;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.72);
      min-width: 0;
    }

    .user-meta dt {
      margin: 0;
      color: var(--admin-muted);
      font-size: 0.68rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .user-meta dd {
      margin: 0.2rem 0 0;
      font-size: 0.86rem;
      font-weight: 800;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .control-strip,
    .incident-actions {
      display: grid;
      grid-template-columns: minmax(160px, 1fr) auto auto;
      gap: 0.75rem;
      align-items: end;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--admin-line);
    }

    .field-control {
      display: grid;
      gap: 0.38rem;
      min-width: 0;
    }

    .field-control span,
    .switch-control em {
      color: var(--admin-muted);
      font-size: 0.72rem;
      font-style: normal;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    select {
      width: 100%;
      border: 1.5px solid var(--admin-line);
      border-radius: 16px;
      background: #ffffff;
      color: var(--admin-ink);
      padding: 0.75rem 0.9rem;
      font: inherit;
      font-weight: 800;
      min-height: 46px;
    }

    select:focus {
      outline: none;
      border-color: var(--admin-primary);
      box-shadow: 0 0 0 4px rgba(255, 68, 31, 0.12);
    }

    .switch-control {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-height: 48px;
      cursor: pointer;
    }

    .switch-control input { display: none; }
    .switch-track {
      width: 2.7rem;
      height: 1.5rem;
      border-radius: 999px;
      background: #cbd5e1;
      padding: 3px;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }
    .switch-track span {
      display: block;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
      transition: transform 0.2s ease;
    }
    .switch-control input:checked + .switch-track { background: #0f766e; }
    .switch-control input:checked + .switch-track span { transform: translateX(1.18rem); }

    .save-action {
      background: var(--admin-primary);
      color: #ffffff;
      box-shadow: 0 12px 24px rgba(255, 68, 31, 0.22);
    }

    .save-action--compact { padding-inline: 1rem; }

    .incident-card {
      display: grid;
      gap: 0.8rem;
    }

    .incident-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .incident-card__header div { display: grid; gap: 0.25rem; }
    .incident-number {
      color: var(--admin-primary-strong);
      font-size: 0.72rem;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .incident-card p {
      margin: 0;
      color: var(--admin-muted);
      font-weight: 650;
      line-height: 1.5;
    }

    .incident-meta-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .incident-meta-grid span {
      border: 1px solid var(--admin-line);
      background: #ffffff;
      color: var(--admin-muted);
      border-radius: 999px;
      padding: 0.34rem 0.65rem;
      font-size: 0.76rem;
      font-weight: 850;
    }

    .incident-actions { grid-template-columns: minmax(170px, 1fr) auto; }

    .status-pill.pending,
    .mini-pill.pending { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .status-pill.accepted,
    .mini-pill.accepted { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-pill.ready,
    .mini-pill.ready { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
    .status-pill.assigned,
    .mini-pill.assigned { background: #eff6ff; color: #1e3a8a; border-color: #bfdbfe; }
    .status-pill.in-transit,
    .mini-pill.in-transit { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }
    .status-pill.delivered,
    .mini-pill.delivered { background: #ecfdf5; color: #065f46; border-color: #6ee7b7; }
    .status-pill.rejected,
    .mini-pill.rejected { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
    .status-pill.cancelled,
    .mini-pill.cancelled { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .status-pill.open,
    .mini-pill.open { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .status-pill.in-review,
    .mini-pill.in-review { background: #faf5ff; color: #6b21a8; border-color: #e9d5ff; }
    .status-pill.resolved,
    .mini-pill.resolved { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .status-pill.closed,
    .mini-pill.closed { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .status-pill.default,
    .mini-pill.default { background: #f8fafc; color: #475569; border-color: #cbd5e1; }

    .empty-state {
      min-height: 270px;
      border: 1px dashed var(--admin-line-strong);
      border-radius: 26px;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 0.55rem;
      text-align: center;
      background: #fffaf7;
      padding: 2rem;
    }

    .empty-state__badge {
      width: 3.4rem;
      height: 3.4rem;
      border-radius: 20px;
      display: grid;
      place-items: center;
      color: #ffffff;
      background: var(--admin-ink);
      font-weight: 950;
    }

    .empty-state h4 { margin: 0; font-size: 1.1rem; }
    .empty-state p { margin: 0; color: var(--admin-muted); font-weight: 650; }

    .notice {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.95rem 1.1rem;
      border-radius: 20px;
      font-weight: 850;
    }

    .notice__dot {
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .notice--success { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
    .notice--success .notice__dot { background: #10b981; }
    .notice--error { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
    .notice--error .notice__dot { background: #ef4444; }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(0, 0, 0, 0.18);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    .spinner--white { border-color: rgba(255, 255, 255, 0.36); border-top-color: #ffffff; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1180px) {
      .summary-grid,
      .admin-workspace { grid-template-columns: 1fr; }
      .summary-card { min-height: auto; }
    }

    @media (max-width: 720px) {
      .admin-page { gap: 1rem; }
      .admin-hero,
      .panel { border-radius: 24px; }
      .admin-hero { align-items: stretch; flex-direction: column; }
      .admin-hero__actions { width: 100%; }
      .refresh-action { width: 100%; }
      .summary-grid { gap: 0.8rem; }
      .summary-card { border-radius: 22px; }
      .panel-header,
      .incident-card__header { flex-direction: column; }
      .user-card__top { grid-template-columns: auto minmax(0, 1fr); }
      .user-card__badges { grid-column: 1 / -1; justify-content: flex-start; }
      .user-meta,
      .control-strip,
      .incident-actions { grid-template-columns: 1fr; }
      .save-action { width: 100%; }
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

  protected totalCount(items: StatusCount[]): number {
    return items.reduce((total, item) => total + Number(item.count || 0), 0);
  }

  protected openIncidentCount(): number {
    return this.metrics.incidentsByStatus
      .filter((item) => item.status === 'OPEN' || item.status === 'IN_REVIEW')
      .reduce((total, item) => total + Number(item.count || 0), 0);
  }

  protected activeUsersCount(): number {
    return this.users.filter((user) => user.is_active).length;
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
