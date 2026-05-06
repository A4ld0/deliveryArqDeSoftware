import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { IncidentItem, OrderSummary } from '../core/models';

@Component({
  selector: 'app-client-incidents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="card">
      <div class="card-header">
        <div class="card-header__left">
          <span class="step-badge">04</span>
          <h3>Reportar incidencia</h3>
        </div>
      </div>

      @if (!orders.length) {
        <div class="empty-state">
          <span class="empty-state__icon">📋</span>
          <p>Necesitas al menos un pedido para poder reportar una incidencia.</p>
        </div>
      } @else {
        <form class="form" (submit)="createIncident($event)">
          <label>
            <span class="label-text">Pedido relacionado</span>
            <select name="incidentOrderId" [(ngModel)]="incidentOrderId" required>
              @for (order of orders; track order.id) {
                <option [ngValue]="order.id">#{{ order.id }} — {{ order.status }}</option>
              }
            </select>
          </label>

          <label>
            <span class="label-text">Título del problema</span>
            <input
              type="text"
              name="incidentTitle"
              [(ngModel)]="incidentTitle"
              required
              minlength="5"
              maxlength="120"
              placeholder="Ej. No llegó mi pedido completo"
            />
          </label>

          <label>
            <span class="label-text">Descripción detallada</span>
            <input
              type="text"
              name="incidentDescription"
              [(ngModel)]="incidentDescription"
              required
              minlength="10"
              maxlength="500"
              placeholder="Describe el problema con el mayor detalle posible"
            />
          </label>

          <button type="submit" class="btn btn--primary" [disabled]="savingIncident">
            @if (savingIncident) {
              <span class="spinner"></span>
              Enviando...
            } @else {
              ✉ Enviar incidencia
            }
          </button>
        </form>
      }
    </article>

    <article class="card">
      <div class="card-header">
        <h3>Mis incidencias</h3>
        <button type="button" class="btn btn--ghost btn--sm" (click)="loadIncidents()" [disabled]="loadingIncidents">
          @if (loadingIncidents) { <span class="spinner"></span> Cargando... }
          @else { ↻ Recargar }
        </button>
      </div>

      @if (!incidents.length) {
        <div class="empty-state">
          <span class="empty-state__icon">✅</span>
          <p>No tienes incidencias reportadas.</p>
        </div>
      } @else {
        <ul class="incident-list">
          @for (incident of incidents; track incident.id) {
            <li class="incident-item">
              <div class="incident-item__header">
                <div class="incident-item__id">
                  <span class="incident-num">#{{ incident.id }}</span>
                  <span [class]="'incident-status ' + incidentStatusClass(incident.status)">
                    {{ incident.status }}
                  </span>
                </div>
                <span class="incident-order">Pedido #{{ incident.order_id }}</span>
              </div>
              <strong class="incident-item__title">{{ incident.title }}</strong>
              <p class="incident-item__desc">{{ incident.description }}</p>
            </li>
          }
        </ul>
      }
    </article>

    @if (message) {
      <div class="alert alert--success">✓ {{ message }}</div>
    }
    @if (errorMessage) {
      <div class="alert alert--error">{{ errorMessage }}</div>
    }
  `,
  styles: `
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--panel);
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
    }

    .card + .card { margin-top: var(--space-4); }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .card-header__left { display: flex; align-items: center; gap: var(--space-3); }
    h3 { margin: 0; }

    .step-badge {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(248, 92, 35, 0.25);
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

    .btn--ghost:hover:not([disabled]) { border-color: var(--line-strong); }
    .btn--sm { padding: 0.38rem 0.8rem; font-size: 0.82rem; }
    .btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) 0;
      text-align: center;
    }

    .empty-state__icon { font-size: 2.5rem; }
    .empty-state p { margin: 0; color: var(--muted); font-size: 0.92rem; }

    /* ── Form ── */
    .form { display: grid; gap: var(--space-4); }

    label { display: grid; gap: 0.42rem; }

    .label-text {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    input, select {
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      font: inherit;
      font-size: 0.92rem;
      background: var(--surface);
      color: var(--ink);
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 44px;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.12);
    }

    input::placeholder { color: var(--muted-2); font-size: 0.88rem; }

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
      border-radius: var(--radius-sm);
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

    .incident-num { font-weight: 800; font-size: 0.9rem; color: var(--ink); }
    .incident-order { font-size: 0.8rem; color: var(--muted); font-weight: 500; }

    .incident-item__title { font-size: 0.95rem; font-weight: 700; color: var(--ink); }
    .incident-item__desc { margin: 0; font-size: 0.85rem; color: var(--muted); line-height: 1.5; }

    /* ── Incident status ── */
    .incident-status {
      display: inline-flex;
      padding: 0.18rem 0.6rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }

    .incident-status.open     { background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
    .incident-status.in-review { background: #faf5ff; color: #6b21a8; border-color: #e9d5ff; }
    .incident-status.resolved { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
    .incident-status.closed   { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
    .incident-status.default  { background: var(--surface); color: var(--muted); border-color: var(--line); }

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

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Alerts ── */
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .alert--success { background: var(--success-soft); border: 1px solid #a7f3d0; color: #065f46; }
    .alert--error { background: var(--danger-soft); border: 1px solid #fecaca; color: var(--danger); }
  `
})
export class ClientIncidentsPageComponent {
  protected orders: OrderSummary[] = [];
  protected incidents: IncidentItem[] = [];

  protected loadingIncidents = false;
  protected savingIncident = false;

  protected incidentOrderId: number | null = null;
  protected incidentTitle = '';
  protected incidentDescription = '';

  protected message = '';
  protected errorMessage = '';

  constructor(private readonly apiService: ApiService) {
    void this.boot();
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

  protected async loadIncidents(): Promise<void> {
    this.loadingIncidents = true;
    this.errorMessage = '';
    try {
      this.incidents = await this.apiService.getIncidents();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar incidencias.');
    } finally {
      this.loadingIncidents = false;
    }
  }

  protected async createIncident(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';

    if (!this.incidentOrderId) {
      this.errorMessage = 'Selecciona un pedido.';
      return;
    }

    const title = this.incidentTitle.trim();
    const description = this.incidentDescription.trim();

    if (title.length < 5) {
      this.errorMessage = 'El título debe tener al menos 5 caracteres.';
      return;
    }

    if (description.length < 10) {
      this.errorMessage = 'La descripción debe tener al menos 10 caracteres.';
      return;
    }

    this.savingIncident = true;
    try {
      const incident = await this.apiService.createIncident({
        orderId: this.incidentOrderId,
        title,
        description
      });
      this.message = `Incidencia #${incident.id} creada.`;
      this.incidentTitle = '';
      this.incidentDescription = '';
      await this.loadIncidents();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo crear la incidencia.');
    } finally {
      this.savingIncident = false;
    }
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadOrders(), this.loadIncidents()]);
  }

  private async loadOrders(): Promise<void> {
    try {
      this.orders = await this.apiService.getMyOrders();
      this.incidentOrderId = this.orders[0]?.id ?? null;
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos.');
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: string } | null;
      if (payload?.error) return payload.error;
      return `HTTP ${error.status}: ${error.statusText || fallback}`;
    }

    if (error instanceof Error) return error.message;
    return fallback;
  }
}