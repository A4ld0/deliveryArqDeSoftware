import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Restaurant } from '../core/models';
import { SessionService } from '../core/session.service';

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="page">
    
    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-content">
        <h1>Tu comida favorita,<br>entregada al instante.</h1>
        <p>Descubre los mejores restaurantes de tu zona y recibe tu pedido en minutos.</p>
        
        @if (!isAuthenticated()) {
          <div class="hero-actions">
            <a routerLink="/auth/login" class="btn-primary">Empezar ahora</a>
            <span class="hero-hint">Únete a la red de entrega más rápida de México</span>
          </div>
        }
      </div>
      <div class="hero-visual">
        <!-- Abstract visual element -->
        <div class="visual-blob"></div>
      </div>
    </div>

    <!-- Quick Categories -->
    <div class="section-container">
      <div class="section-header">
        <h2>Explora por categoría</h2>
      </div>
      <div class="quick-categories">
        @for (cat of categories; track cat.name) {
          <div class="cat-item">
            <div class="cat-icon" [style.background]="cat.color">
              <span class="cat-emoji">{{ cat.emoji }}</span>
            </div>
            <span>{{ cat.name }}</span>
          </div>
        }
      </div>
    </div>

    <!-- Restaurants Section -->
    <div class="section-container">
      <div class="section-header">
        <h2>Restaurantes destacados</h2>
        <a (click)="goToShop()" class="see-all">Ver todos</a>
      </div>

      @if (loading()) {
        <div class="skeleton-grid">
          @for (n of [1,2,3,4]; track n) {
            <div class="skeleton-card"></div>
          }
        </div>
      } @else if (restaurants().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🍽️</span>
          <p>No hay restaurantes disponibles en este momento.</p>
        </div>
      } @else {
        <div class="restaurant-grid">
          @for (rest of restaurants().slice(0, 8); track rest.id) {
            <article class="rest-card" (click)="selectRestaurant(rest)">
              <div class="rest-image" [style.background]="bannerGradient(rest.id)">
                <span class="rest-initial">{{ rest.name.charAt(0) }}</span>
                @if (rest.is_open) {
                  <div class="status-badge">Abierto</div>
                }
              </div>
              <div class="rest-info">
                <div class="rest-title-row">
                  <h3>{{ rest.name }}</h3>
                </div>
                <p class="rest-desc">{{ rest.description || 'Deliciosa comida preparada al momento.' }}</p>
                <div class="rest-meta">
                  <span class="location">📍 {{ rest.address }}</span>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>

  </section>
  `,
  styles: `
  .page { display: flex; flex-direction: column; gap: 4rem; padding-bottom: 5rem; }

  /* Hero */
  .hero {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 2rem;
    align-items: center;
    min-height: 400px;
    background: linear-gradient(135deg, #fff 0%, #fdf5f2 100%);
    border-radius: 32px;
    padding: 3rem;
    margin-top: 1rem;
    border: 1px solid var(--line);
    overflow: hidden;
    position: relative;
  }

  .hero-content h1 { font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin: 0; color: var(--ink); }
  .hero-content p { font-size: 1.2rem; color: var(--muted); margin: 1.5rem 0 2.5rem; max-width: 500px; line-height: 1.6; }
  
  .hero-actions { display: flex; flex-direction: column; gap: 1rem; }
  .btn-primary { 
    background: var(--primary); 
    color: white; 
    padding: 1.2rem 2.5rem; 
    border-radius: 99px; 
    font-weight: 800; 
    font-size: 1.1rem; 
    text-decoration: none; 
    width: fit-content;
    box-shadow: 0 10px 25px rgba(248, 92, 35, 0.3);
    transition: all 0.2s;
  }
  .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(248, 92, 35, 0.4); }
  .hero-hint { font-size: 0.85rem; color: var(--muted); font-weight: 600; padding-left: 0.5rem; }

  .hero-visual { position: relative; height: 100%; display: flex; align-items: center; justify-content: center; }
  .visual-blob { 
    width: 300px; height: 300px; 
    background: var(--primary-soft); 
    border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
    animation: blobify 10s infinite alternate;
  }

  @keyframes blobify {
    0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
    100% { border-radius: 70% 30% 30% 70% / 60% 40% 40% 60%; }
  }

  /* Secciones */
  .section-container { display: flex; flex-direction: column; gap: 2rem; }
  .section-header { display: flex; justify-content: space-between; align-items: flex-end; }
  .section-header h2 { font-size: 1.75rem; font-weight: 800; margin: 0; }
  .see-all { color: var(--primary); font-weight: 800; cursor: pointer; text-decoration: none; font-size: 0.95rem; }

  /* Categorías */
  .quick-categories { display: flex; gap: 2rem; overflow-x: auto; padding: 0.5rem 0; scrollbar-width: none; }
  .quick-categories::-webkit-scrollbar { display: none; }
  .cat-item { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; cursor: pointer; flex-shrink: 0; }
  .cat-icon { 
    width: 100px; height: 100px; 
    border-radius: 28px; 
    display: grid; place-items: center; 
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
    border: 1px solid rgba(0,0,0,0.03);
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  }
  .cat-emoji { font-size: 2.5rem; }
  .cat-item:hover .cat-icon { transform: translateY(-8px) rotate(3deg); box-shadow: 0 12px 25px rgba(0,0,0,0.08); }
  .cat-item span { font-size: 0.95rem; font-weight: 700; color: var(--ink); }

  /* Restaurantes */
  .restaurant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
  .rest-card { cursor: pointer; background: white; border-radius: 24px; border: 1px solid var(--line); overflow: hidden; transition: all 0.3s; }
  .rest-card:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.08); border-color: var(--line-strong); }
  
  .rest-image { 
    height: 180px; 
    display: flex; align-items: center; justify-content: center; 
    position: relative;
  }
  .rest-initial { font-size: 4rem; font-weight: 900; color: rgba(255,255,255,0.9); text-shadow: 0 4px 15px rgba(0,0,0,0.1); }
  .status-badge { 
    position: absolute; top: 1rem; right: 1rem; 
    background: #34d399; color: white; 
    padding: 0.3rem 0.8rem; border-radius: 99px; 
    font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
  }

  .rest-info { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .rest-title-row h3 { font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--ink); }
  .rest-desc { margin: 0; font-size: 0.9rem; color: var(--muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rest-meta { margin-top: 0.5rem; display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: var(--muted); font-weight: 600; }

  /* Skeletons */
  .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2rem; }
  .skeleton-card { height: 320px; border-radius: 24px; background: #f3f4f6; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }

  .empty-state { text-align: center; padding: 4rem 0; }
  .empty-icon { font-size: 3rem; margin-bottom: 1rem; display: block; }

  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; padding: 2rem; text-align: center; }
    .hero-content { display: flex; flex-direction: column; align-items: center; }
    .hero-visual { display: none; }
  }
  `
})
export class HomePageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.sessionService.isAuthenticated;
  
  categories = [
    { name: 'Restaurantes', color: '#FFF0ED', emoji: '🍔' },
    { name: 'Supermercado', color: '#E8F8F0', emoji: '🛒' },
    { name: 'Farmacia', color: '#EAF3FF', emoji: '💊' },
    { name: 'Bebidas', color: '#FDF4E5', emoji: '🥤' },
    { name: 'Mascotas', color: '#F4EBFF', emoji: '🐶' }
  ];

  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);

  async ngOnInit() {
    try {
      const data = await this.apiService.getRestaurants();
      this.restaurants.set(data);
    } catch (err) {
      console.error('Error fetching restaurants', err);
    } finally {
      this.loading.set(false);
    }
  }

  protected bannerGradient(id: number): string {
    return GRADIENTS[id % GRADIENTS.length];
  }

  protected async selectRestaurant(rest: Restaurant) {
    if (!this.isAuthenticated()) {
      await this.router.navigateByUrl('/auth/login');
    } else {
      // In a real app, we'd navigate to client/shop with this restaurant selected
      await this.router.navigateByUrl('/client/shop');
    }
  }

  protected async goToShop() {
    if (!this.isAuthenticated()) {
      await this.router.navigateByUrl('/auth/login');
    } else {
      await this.router.navigateByUrl('/client/shop');
    }
  }
}