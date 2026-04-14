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
        <div>
          <h2>Panel Cliente</h2>
          <p>Compra, paga y da seguimiento en un flujo claro por secciones.</p>
        </div>

        <nav class="subnav">
          <a routerLink="shop" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="tag">01</span>
            <span>Comprar</span>
          </a>
          <a routerLink="checkout" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="tag">02</span>
            <span>Checkout</span>
          </a>
          <a routerLink="orders" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="tag">03</span>
            <span>Pedidos</span>
          </a>
          <a routerLink="incidents" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="tag">04</span>
            <span>Incidencias</span>
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
    }
    .shell-nav {
      display: grid;
      gap: var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--panel);
      padding: var(--space-4);
      box-shadow: var(--shadow-sm);
    }
    h2 { margin: 0; }
    p { margin: var(--space-2) 0 0; color: var(--muted); font-size: 0.94rem; }
    .subnav {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      padding-bottom: var(--space-1);
      scrollbar-width: thin;
    }
    .subnav a {
      text-decoration: none;
      border: 1px solid var(--line);
      border-radius: 999px;
      min-height: 48px;
      padding: 0.5rem 0.8rem;
      color: var(--ink);
      background: var(--surface);
      font-weight: 600;
      font-size: 0.9rem;
      transition: all .18s ease;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      white-space: nowrap;
    }
    .tag {
      width: 1.45rem;
      height: 1.45rem;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      display: grid;
      place-items: center;
      font-size: 0.69rem;
      font-weight: 800;
      background: #fff;
    }
    .subnav a.active,
    .subnav a:hover {
      border-color: var(--primary);
      background: var(--primary-soft);
    }
    .subnav a.active .tag {
      border-color: transparent;
      background: var(--primary);
      color: #fff;
    }

    .shell-content {
      display: grid;
      gap: var(--space-4);
    }

    @media (min-width: 980px) {
      .shell {
        grid-template-columns: 260px minmax(0, 1fr);
        align-items: start;
      }
      .shell-nav {
        align-self: start;
      }
      .subnav {
        flex-direction: column;
        overflow: visible;
        padding: 0;
      }
      .subnav a {
        border-radius: var(--radius-sm);
        justify-content: flex-start;
      }
    }
  `
})
export class ClientShellPageComponent {}
