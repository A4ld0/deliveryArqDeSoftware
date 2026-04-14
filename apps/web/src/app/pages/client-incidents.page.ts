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
      <h3>Reportar incidencia</h3>

      @if (!orders.length) {
        <p class="muted">Necesitas al menos un pedido para reportar incidencia.</p>
      } @else {
        <form class="form" (submit)="createIncident($event)">
          <label>
            Pedido
            <select name="incidentOrderId" [(ngModel)]="incidentOrderId" required>
              @for (order of orders; track order.id) {
                <option [ngValue]="order.id">#{{ order.id }} - {{ order.status }}</option>
              }
            </select>
          </label>

          <label>
            Titulo
            <input
              type="text"
              name="incidentTitle"
              [(ngModel)]="incidentTitle"
              required
              minlength="5"
              maxlength="120"
            />
          </label>

          <label>
            Descripcion
            <input
              type="text"
              name="incidentDescription"
              [(ngModel)]="incidentDescription"
              required
              minlength="10"
              maxlength="500"
            />
          </label>

          <button type="submit" [disabled]="savingIncident">
            {{ savingIncident ? 'Enviando...' : 'Enviar incidencia' }}
          </button>
        </form>
      }
    </article>

    <article class="card">
      <div class="card-title">
        <h3>Mis incidencias</h3>
        <button type="button" class="ghost" (click)="loadIncidents()" [disabled]="loadingIncidents">
          {{ loadingIncidents ? 'Cargando...' : 'Recargar' }}
        </button>
      </div>

      @if (!incidents.length) {
        <p class="muted">No has reportado incidencias.</p>
      } @else {
        <ul class="list">
          @for (incident of incidents; track incident.id) {
            <li>
              <div class="row">
                <strong>#{{ incident.id }} - {{ incident.status }}</strong>
                <span>Pedido #{{ incident.order_id }}</span>
              </div>
              <strong>{{ incident.title }}</strong>
              <span class="meta">{{ incident.description }}</span>
            </li>
          }
        </ul>
      }
    </article>

    @if (message) {
      <p class="message">{{ message }}</p>
    }
    @if (errorMessage) {
      <p class="error">{{ errorMessage }}</p>
    }
  `,
  styles: `
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--panel);
      padding: var(--space-5);
      margin: 0;
      box-shadow: var(--shadow-sm);
    }
    .card + .card { margin-top: var(--space-4); }
    .card-title { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .card-title h3 { margin: 0; }
    .form { display: grid; gap: var(--space-3); margin-top: var(--space-3); }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; }
    input, select {
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      padding: 0.62rem 0.72rem;
      font: inherit;
      background: var(--surface);
    }
    .list { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: grid; gap: var(--space-3); }
    .list li {
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: var(--surface);
      padding: var(--space-3);
      display: grid;
      gap: var(--space-2);
    }
    .row { display: flex; justify-content: space-between; gap: 0.5rem; align-items: center; }
    .meta { font-size: 0.88rem; color: var(--muted); line-height: 1.4; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 0.58rem 0.92rem;
      background: var(--primary);
      color: #fff;
      cursor: pointer;
      font-weight: 700;
    }
    .ghost { background: var(--surface); border: 1px solid var(--line); color: var(--ink); font-weight: 600; }
    .muted { color: var(--muted); margin-top: var(--space-2); }
    .message { color: var(--primary); font-weight: 700; margin-top: var(--space-4); }
    .error { color: var(--danger); font-weight: 700; margin-top: var(--space-4); }
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
      this.errorMessage = 'El titulo debe tener al menos 5 caracteres.';
      return;
    }

    if (description.length < 10) {
      this.errorMessage = 'La descripcion debe tener al menos 10 caracteres.';
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
