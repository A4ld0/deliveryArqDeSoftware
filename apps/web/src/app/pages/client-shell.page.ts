import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-client-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="shell">
      <aside class="shell-nav">
        <div class="shell-nav__header">
          <div class="shell-nav__title">
            <span class="shell-nav__icon">🛒</span>
            <div>
              <h2>Panel Cliente</h2>
              <p>Compra, paga y da seguimiento en un flujo claro por secciones.</p>
            </div>
          </div>
        </div>

        <nav class="subnav">
          <a routerLink="shop" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-step">01</span>
            <span class="nav-label">
              <strong>Comprar</strong>
              <small>Elige restaurante y menú</small>
            </span>
          </a>
          <a routerLink="checkout" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-step">02</span>
            <span class="nav-label">
              <strong>Checkout</strong>
              <small>Confirma y paga tu pedido</small>
            </span>
          </a>
          <a routerLink="orders" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-step">03</span>
            <span class="nav-label">
              <strong>Pedidos</strong>
              <small>Seguimiento en tiempo real</small>
            </span>
          </a>
          <a routerLink="incidents" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-step">04</span>
            <span class="nav-label">
              <strong>Incidencias</strong>
              <small>Reporta un problema</small>
            </span>
          </a>
        </nav>
      </aside>

      <main class="shell-content">
        <router-outlet />
      </main>
    </section>
  `,
  styles: `
    .shell {
      display: grid;
      gap: var(--space-4);
      align-items: start;
    }

    /* ── Nav ── */
    .shell-nav {
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--panel);
      padding: var(--space-4);
      box-shadow: var(--shadow-sm);
      display: grid;
      gap: var(--space-4);
    }

    .shell-nav__header {
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--line);
    }

    .shell-nav__title {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .shell-nav__icon {
      font-size: 1.6rem;
      line-height: 1;
      flex-shrink: 0;
    }

    h2 { margin: 0; font-size: clamp(1.1rem, 1.3vw, 1.3rem); }
    p { margin: var(--space-1) 0 0; color: var(--muted); font-size: 0.84rem; line-height: 1.45; }

    /* ── Subnav ── */
    .subnav {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }

    .subnav::-webkit-scrollbar { display: none; }

    .subnav a {
      text-decoration: none;
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: var(--space-2) var(--space-3);
      color: var(--muted);
      background: var(--surface-alt);
      font-size: 0.84rem;
      transition: all 0.18s ease;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      white-space: nowrap;
      min-height: 52px;
    }

    .subnav a:hover {
      border-color: var(--line-strong);
      color: var(--ink);
      background: var(--surface);
      transform: translateY(-1px);
      box-shadow: var(--shadow-xs);
    }

    .subnav a.active {
      border-color: var(--primary);
      background: var(--primary-soft);
      color: var(--primary-strong);
    }

    .subnav a.active .nav-step {
      background: var(--primary);
      color: #fff;
      border-color: transparent;
    }

    .nav-step {
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 50%;
      border: 1.5px solid var(--line-strong);
      background: var(--panel);
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      font-weight: 800;
      flex-shrink: 0;
      transition: all 0.18s ease;
    }

    .nav-label {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .nav-label strong {
      font-size: 0.86rem;
      font-weight: 700;
      color: inherit;
    }

    .nav-label small {
      font-size: 0.73rem;
      opacity: 0.7;
    }

    /* ── Content ── */
    .shell-content {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    /* ── Responsive ── */
    @media (min-width: 980px) {
      .shell {
        grid-template-columns: 280px minmax(0, 1fr);
      }

      .shell-nav {
        position: sticky;
        top: calc(var(--space-4) + 90px);
      }

      .subnav {
        flex-direction: column;
        overflow: visible;
        padding: 0;
        gap: var(--space-2);
      }

      .subnav a {
        border-radius: var(--radius-sm);
        justify-content: flex-start;
        width: 100%;
      }
    }
  `
})
export class ClientShellPageComponent {}