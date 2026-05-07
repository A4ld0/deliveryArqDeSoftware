import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import type { IncidentItem, OrderSummary } from '../core/models';

@Component({
  selector: 'app-client-incidents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="incidents-page anim-fade-in">
      <header class="page-header">
        <div class="header-text">
          <h1>Soporte y Ayuda</h1>
          <p>¿Algo no salió como esperabas? Estamos aquí para ayudarte.</p>
        </div>
      </header>

      <div class="incidents-grid">
        <!-- FORM SECTION -->
        <section class="incident-form-card">
          <div class="card-title">
            <span class="icon">✉️</span>
            <h3>Reportar un problema</h3>
          </div>
          
          @if (!orders().length) {
            <div class="form-empty">
              <p>No tienes pedidos recientes para reportar una incidencia.</p>
              <button class="primary-btn" routerLink="/">Volver a la tienda</button>
            </div>
          } @else {
            <form class="incident-form" (submit)="createIncident($event)">
              <div class="form-group">
                <label for="incident-order">Selecciona tu pedido</label>
                <div class="select-wrapper">
                  <select id="incident-order" name="incidentOrderId" [(ngModel)]="incidentOrderId" required>
                    <option [ngValue]="null" disabled>Elige un pedido...</option>
                    @for (order of orders(); track order.id) {
                      <option [ngValue]="order.id">Pedido #{{ order.id }} — {{ order.status }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="incident-title">Título del reporte</label>
                <input
                  id="incident-title"
                  type="text"
                  name="incidentTitle"
                  [(ngModel)]="incidentTitle"
                  required
                  minlength="5"
                  maxlength="120"
                  placeholder="Ej. Faltó un producto en mi pedido"
                />
              </div>

              <div class="form-group">
                <label for="incident-description">Descripción detallada</label>
                <textarea
                  id="incident-description"
                  name="incidentDescription"
                  [(ngModel)]="incidentDescription"
                  required
                  minlength="10"
                  maxlength="500"
                  rows="4"
                  placeholder="Cuéntanos qué sucedió con el mayor detalle posible para darte una solución rápida."
                ></textarea>
              </div>

              @if (errorMessage()) {
                <div class="error-alert" role="alert">{{ errorMessage() }}</div>
              }
              @if (successMessage()) {
                <div class="success-alert" role="status" aria-live="polite">{{ successMessage() }}</div>
              }

              <button type="submit" class="submit-btn" [disabled]="savingIncident() || !incidentOrderId" [attr.aria-busy]="savingIncident()">
                @if (savingIncident()) { <span class="loader loader--sm"></span> }
                @else { Enviar reporte }
              </button>
            </form>
          }
        </section>

        <!-- LIST SECTION -->
        <section class="incident-list-card">
          <header class="card-header">
            <div class="card-title">
              <span class="icon">📋</span>
              <h3>Mis Reportes</h3>
            </div>
            <button type="button" class="icon-btn" (click)="loadIncidents()" [disabled]="loadingIncidents()" aria-label="Recargar incidencias">
              <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" [class.spinning]="loadingIncidents()"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.57L21 8M21 3v5h-5"/></svg>
            </button>
          </header>

          <div class="incidents-container" aria-live="polite">
            @if (loadingIncidents() && !incidents().length) {
              <div class="list-loading"><span class="loader"></span></div>
            } @else if (!incidents().length) {
              <div class="list-empty">
                <p>No tienes incidencias activas en este momento.</p>
              </div>
            } @else {
              @for (incident of incidents(); track incident.id) {
                <div class="incident-item">
                  <div class="incident-item__head">
                    <span class="ticket-id">Ticket #{{ incident.id }}</span>
                    <span class="ticket-status" [class]="'status--' + incident.status.toLowerCase().replace('_', '-')">
                      {{ statusLabel(incident.status) }}
                    </span>
                  </div>
                  <strong class="ticket-title">{{ incident.title }}</strong>
                  <div class="ticket-meta">Relacionado con Pedido #{{ incident.order_id }}</div>
                  <p class="ticket-desc">{{ incident.description }}</p>
                </div>
              }
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .incidents-page { max-width: 1200px; margin: 0 auto; padding-bottom: 4rem; }
    
    .page-header { margin-bottom: 2.5rem; }
    .header-text h1 { margin: 0; font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em; }
    .header-text p { margin: 0.4rem 0 0; color: var(--muted); font-size: 1.1rem; }

    .incidents-grid { display: grid; grid-template-columns: 1fr 450px; gap: 2rem; align-items: flex-start; }

    /* ── CARD STYLES ── */
    .incident-form-card, .incident-list-card { background: white; border-radius: 28px; border: 1.5px solid var(--line); padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
    .card-title { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 2rem; }
    .card-title .icon { font-size: 1.5rem; }
    .card-title h3 { margin: 0; font-size: 1.4rem; font-weight: 850; }

    .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .icon-btn { background: var(--bg-app); border: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--muted); transition: all 0.2s; }
    .icon-btn:hover { background: var(--primary-soft); color: var(--primary); }
    .icon-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .spinning { animation: spin 1s linear infinite; }

    /* ── FORM ── */
    .incident-form { display: grid; gap: 1.5rem; }
    .form-group { display: grid; gap: 0.6rem; }
    .form-group label { font-size: 0.9rem; font-weight: 700; color: var(--ink); }
    
    .select-wrapper { position: relative; }
    select, input, textarea { width: 100%; padding: 0.9rem 1.2rem; border-radius: 14px; border: 1.5px solid var(--line); background: var(--bg-app); font-size: 0.95rem; font-family: inherit; transition: all 0.2s; }
    select:focus, input:focus, textarea:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px var(--primary-soft); }
    
    .submit-btn { background: var(--ink); color: white; border: none; padding: 1.1rem; border-radius: 99px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; margin-top: 1rem; }
    .submit-btn:hover:not(:disabled) { background: var(--primary); transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,68,31,0.2); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .error-alert { background: #fef2f2; color: #b91c1c; padding: 1rem; border-radius: 14px; font-size: 0.85rem; font-weight: 700; border: 1px solid #fee2e2; }
    .success-alert { background: #f0fdf4; color: #15803d; padding: 1rem; border-radius: 14px; font-size: 0.85rem; font-weight: 700; border: 1px solid #dcfce7; }

    /* ── LIST ── */
    .incidents-container { display: grid; gap: 1rem; }
    .incident-item { background: var(--bg-app); padding: 1.5rem; border-radius: 20px; border: 1.5px solid var(--line); display: grid; gap: 0.6rem; transition: all 0.2s; }
    .incident-item:hover { border-color: var(--primary-soft); transform: scale(1.02); }
    
    .incident-item__head { display: flex; justify-content: space-between; align-items: center; }
    .ticket-id { font-size: 0.75rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .ticket-status { font-size: 0.65rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.2rem 0.6rem; border-radius: 99px; }
    .status--open { background: #fff7ed; color: #c2410c; }
    .status--resolved { background: #f0fdf4; color: #15803d; }
    .status--closed { background: var(--bg-app); color: var(--muted); border: 1px solid var(--line); }

    .ticket-title { font-size: 1rem; font-weight: 800; color: var(--ink); }
    .ticket-meta { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
    .ticket-desc { margin: 0; font-size: 0.85rem; color: var(--muted); line-height: 1.5; opacity: 0.8; }

    .list-loading { padding: 3rem; display: grid; place-items: center; }
    .list-empty { padding: 3rem; text-align: center; color: var(--muted); font-weight: 500; font-size: 0.9rem; }

    .loader { width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .loader--sm { width: 18px; height: 18px; border-width: 2.5px; border-top-color: white; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .anim-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (max-width: 1000px) {
      .incidents-grid { grid-template-columns: 1fr; }
      .incident-list-card { order: 1; }
      .incident-form-card { order: 2; }
    }
  `
})
export class ClientIncidentsPageComponent {
  private readonly apiService = inject(ApiService);

  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly incidents = signal<IncidentItem[]>([]);
  protected readonly loadingIncidents = signal(false);
  protected readonly savingIncident = signal(false);

  protected incidentOrderId: number | null = null;
  protected incidentTitle = '';
  protected incidentDescription = '';

  protected successMessage = signal('');
  protected errorMessage = signal('');

  constructor() {
    void this.boot();
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'Abierto',
      IN_REVIEW: 'En revisión',
      RESOLVED: 'Resuelto',
      CLOSED: 'Cerrado'
    };
    return map[status] ?? status;
  }

  protected async loadIncidents(): Promise<void> {
    this.loadingIncidents.set(true);
    try {
      const data = await this.apiService.getIncidents();
      this.incidents.set(data);
    } catch (error) {
      console.error('Error loading incidents', error);
    } finally {
      this.loadingIncidents.set(false);
    }
  }

  protected async createIncident(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.incidentOrderId) return;
    if (this.incidentTitle.trim().length < 5) {
      this.errorMessage.set('El título es demasiado corto.');
      return;
    }

    this.savingIncident.set(true);
    try {
      const incident = await this.apiService.createIncident({
        orderId: this.incidentOrderId,
        title: this.incidentTitle.trim(),
        description: this.incidentDescription.trim()
      });
      this.successMessage.set(`Incidencia #${incident.id} enviada correctamente.`);
      this.incidentTitle = '';
      this.incidentDescription = '';
      await this.loadIncidents();
    } catch (error) {
      this.errorMessage.set('No se pudo enviar el reporte. Revisa los datos.');
    } finally {
      this.savingIncident.set(false);
    }
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadOrders(), this.loadIncidents()]);
  }

  private async loadOrders(): Promise<void> {
    try {
      const data = await this.apiService.getMyOrders();
      this.orders.set(data);
      if (data.length > 0) this.incidentOrderId = data[0].id;
    } catch (error) {
      console.error('Error loading orders', error);
    }
  }
}
