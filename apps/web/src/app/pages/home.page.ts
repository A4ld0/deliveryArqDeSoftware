import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">

      <!-- Hero -->
      <div class="hero">
        <div class="hero__copy">
          <span class="chip">
            <span class="chip__dot"></span>
            Plataforma de entregas
          </span>
          <h2>Entrega rápida,<br/>UX clara por roles</h2>
          <p>
            Proyecto académico de delivery con pagos simulados y seguimiento
            en tiempo real para clientes, restaurantes y repartidores.
          </p>
          <div class="hero__actions">
            <a routerLink="/auth/login" class="btn btn--primary">
              Empezar ahora
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          </div>
        </div>

        <div class="hero__meta">
          <div class="hero__meta-inner">
            <span class="meta-label">Flujo simplificado</span>
            <strong>Regístrate, completa tu perfil y entra directo a tu panel según tu rol.</strong>
            <div class="steps">
              <div class="step"><span class="step__num">01</span><span>Crea tu cuenta</span></div>
              <div class="step"><span class="step__num">02</span><span>Elige tu rol</span></div>
              <div class="step"><span class="step__num">03</span><span>Opera tu panel</span></div>
            </div>
          </div>
        </div>
      </div>

      <img
        class="hero-image"
        src="assets/illustration-hero-delivery.svg"
        alt="Ilustración de repartidor y pedidos"
      />

      <!-- Feature cards -->
      <div class="grid">
        <article class="card">
          <div class="card__icon card__icon--client">
            <img src="assets/thumb-client.svg" alt="" aria-hidden="true" />
          </div>
          <h3>Cliente</h3>
          <p>Descubre restaurantes, arma tu pedido y da seguimiento desde un solo panel limpio.</p>
          <span class="card__tag">Comprar · Checkout · Pedidos</span>
        </article>

        <article class="card">
          <div class="card__icon card__icon--restaurant">
            <img src="assets/thumb-restaurant.svg" alt="" aria-hidden="true" />
          </div>
          <h3>Restaurante</h3>
          <p>Publica tu menú, acepta pedidos entrantes y administra tu operación en tiempo real.</p>
          <span class="card__tag">Menú · Pedidos · Perfil</span>
        </article>

        <article class="card">
          <div class="card__icon card__icon--driver">
            <img src="assets/thumb-driver.svg" alt="" aria-hidden="true" />
          </div>
          <h3>Entregador</h3>
          <p>Recibe entregas disponibles, comparte tu GPS y actualiza el estado en ruta.</p>
          <span class="card__tag">Entregas · GPS · Estado</span>
        </article>
      </div>

    </section>
  `,
  styles: `
    .page {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      padding: var(--space-5);
      overflow: hidden;
    }

    /* ── Hero ── */
    .hero {
      display: grid;
      gap: var(--space-4);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background:
        radial-gradient(circle at 96% 10%, rgba(255, 160, 100, 0.22) 0, transparent 42%),
        radial-gradient(circle at 6% 92%, rgba(255, 220, 140, 0.22) 0, transparent 40%),
        linear-gradient(145deg, #fff9f4 0%, #fff3e8 100%);
    }

    .hero__copy {
      padding: var(--space-5);
      display: grid;
      gap: var(--space-4);
      align-content: start;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      width: fit-content;
      padding: 0.26rem 0.72rem;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      font-size: 0.76rem;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.75);
      color: var(--muted);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .chip__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.85); }
    }

    h2 { margin: 0; max-width: 18ch; }

    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.65;
      max-width: 44ch;
    }

    .hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-1);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      border: 0;
      border-radius: 999px;
      padding: 0.65rem 1.2rem;
      font-weight: 700;
      font-size: 0.9rem;
      font-family: inherit;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }

    .btn--primary {
      background: linear-gradient(145deg, var(--primary) 0%, var(--primary-strong) 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(248, 92, 35, 0.28);
    }

    .btn--primary svg {
      width: 1rem;
      height: 1rem;
    }

    .btn--primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(248, 92, 35, 0.36);
    }

    .hero__meta {
      padding: var(--space-4) var(--space-5);
      border-top: 1px dashed var(--line-strong);
    }

    .hero__meta-inner {
      display: grid;
      gap: var(--space-2);
    }

    .meta-label {
      font-size: 0.72rem;
      color: var(--muted-2);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 700;
    }

    .hero__meta strong {
      color: var(--ink);
      font-size: 0.95rem;
      line-height: 1.45;
      font-weight: 600;
    }

    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .step {
      display: flex;
      align-items: center;
      gap: 0.42rem;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--ink-2);
    }

    .step__num {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background: var(--primary-soft);
      border: 1px solid var(--primary-muted);
      color: var(--primary-strong);
      font-size: 0.66rem;
      font-weight: 800;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    /* ── Hero image ── */
    .hero-image {
      width: 100%;
      margin-top: var(--space-4);
      border-radius: var(--radius-lg);
      border: 1px solid var(--line);
      background: linear-gradient(135deg, #fff7f0 0%, #fff2e5 100%);
      display: block;
      max-height: 260px;
      object-fit: cover;
    }

    /* ── Feature grid ── */
    .grid {
      margin-top: var(--space-4);
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      background: var(--panel);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      display: grid;
      gap: var(--space-2);
      align-content: start;
    }

    .card:hover {
      transform: translateY(-3px);
      border-color: var(--line-strong);
      box-shadow: 0 16px 36px rgba(150, 80, 30, 0.12);
    }

    .card__icon {
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-1);
    }

    .card__icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card__icon--client { background: linear-gradient(135deg, #fff0e8, #ffd9c4); }
    .card__icon--restaurant { background: linear-gradient(135deg, #fef9ee, #fde9a8); }
    .card__icon--driver { background: linear-gradient(135deg, #eef5ff, #c3dafd); }

    .card h3 { margin: 0; }
    .card p { margin: 0; font-size: 0.9rem; color: var(--muted); line-height: 1.55; }

    .card__tag {
      display: inline-block;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--muted);
      background: var(--surface-alt);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.18rem 0.6rem;
      width: fit-content;
      margin-top: var(--space-1);
    }

    @media (min-width: 760px) {
      .hero {
        grid-template-columns: 1fr auto;
      }

      .hero__meta {
        border-top: 0;
        border-left: 1px dashed var(--line-strong);
        min-width: 260px;
        max-width: 300px;
      }
    }
  `
})
export class HomePageComponent {}