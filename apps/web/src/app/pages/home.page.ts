import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <div class="hero">
        <div>
          <span class="chip">Plataforma de entregas</span>
          <h2>Entrega rapida, UX clara y operacion por roles</h2>
          <p>
            Proyecto academico de delivery con pagos simulados y seguimiento del pedido en tiempo
            real para clientes, restaurantes y repartidores.
          </p>
          <a routerLink="/auth/login" class="cta">Empezar ahora</a>
        </div>
        <div class="hero__meta">
          <span>Flujo simplificado</span>
          <strong>Registra tu cuenta, completa tu perfil y entra directo a tu panel.</strong>
        </div>
      </div>
      <img
        class="hero-image"
        src="assets/illustration-hero-delivery.svg"
        alt="Ilustracion de repartidor y pedidos"
      />

      <div class="grid">
        <article class="card">
          <img src="assets/thumb-client.svg" alt="Modulo cliente" />
          <h3>Cliente</h3>
          <p>Descubre restaurantes, arma tu pedido y da seguimiento desde un solo panel.</p>
        </article>

        <article class="card">
          <img src="assets/thumb-restaurant.svg" alt="Modulo restaurante" />
          <h3>Restaurante</h3>
          <p>Publica tu menu, acepta pedidos y administra la operacion de tu negocio.</p>
        </article>

        <article class="card">
          <img src="assets/thumb-driver.svg" alt="Modulo repartidor" />
          <h3>Entregador</h3>
          <p>Recibe entregas disponibles y actualiza el estado del pedido durante el recorrido.</p>
        </article>
      </div>
    </section>
  `,
  styles: `
    .page { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 1.25rem; }
    .hero {
      border: 1px solid var(--line);
      border-radius: 16px;
      background:
        radial-gradient(circle at 95% 15%, #ffe6d7 0, transparent 35%),
        radial-gradient(circle at 10% 90%, #fff0cf 0, transparent 40%),
        linear-gradient(150deg, #fff8f2 0%, #fff2e8 100%);
      padding: 1rem;
      display: grid;
      gap: 0.8rem;
      grid-template-columns: 1fr;
    }
    .chip {
      display: inline-block;
      padding: 0.2rem 0.58rem;
      border-radius: 999px;
      border: 1px solid var(--line-strong);
      font-size: 0.75rem;
      font-weight: 700;
      background: #fff;
      color: var(--muted);
    }
    h2 { margin: 0.45rem 0 0; max-width: 18ch; }
    p { color: var(--muted); }
    .cta {
      display: inline-flex;
      margin-top: 0.45rem;
      text-decoration: none;
      border-radius: 999px;
      padding: 0.5rem 0.9rem;
      background: var(--primary);
      color: #fff;
      font-weight: 700;
      border: 1px solid transparent;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgb(230 81 27 / 18%);
    }
    .hero__meta {
      border: 1px dashed var(--line-strong);
      border-radius: 14px;
      background: #fff9f5;
      padding: 0.75rem;
      display: grid;
      gap: 0.25rem;
      align-content: center;
    }
    .hero__meta span {
      font-size: 0.78rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .hero__meta strong {
      color: var(--ink);
      font-size: 0.95rem;
      line-height: 1.4;
    }
    .hero-image {
      margin-top: 0.8rem;
      width: 100%;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: #fff4eb;
      display: block;
    }
    .grid { margin-top: 1rem; display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0.9rem;
      background: var(--panel);
      transition: transform .2s ease, box-shadow .2s ease;
      display: grid;
      gap: 0.5rem;
    }
    .card img {
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: #fff;
    }
    .card:hover { transform: translateY(-3px); box-shadow: 0 16px 26px rgb(180 84 35 / 16%); }
    .card h3 { margin: 0; }
    .card p { margin: 0; font-size: 0.9rem; }
    @media (min-width: 880px) {
      .hero { grid-template-columns: 1fr auto; align-items: stretch; }
      .hero__meta { min-width: 270px; }
    }
  `
})
export class HomePageComponent {}
