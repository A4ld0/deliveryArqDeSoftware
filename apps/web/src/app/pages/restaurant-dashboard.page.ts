import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { OrderSummary, OwnedRestaurant, Product } from '../core/models';

@Component({
  selector: 'app-restaurant-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-viewport anim-fade-in">
      
      <!-- ══ SECTION: DASHBOARD (OVERVIEW) ══ -->
      @if (currentSection() === 'dashboard') {
        <div class="section-container">
          <header class="section-header">
            <div>
              <h1>Centro de Operaciones</h1>
              <p>Monitorea tu negocio y actividad en tiempo real.</p>
            </div>
            <div class="status-selector" [class.open]="restaurantForm.isOpen">
              <div class="status-indicator"></div>
              <div class="status-info">
                <strong>{{ restaurantForm.isOpen ? 'Negocio Abierto' : 'Negocio Cerrado' }}</strong>
                <span>{{ restaurantForm.isOpen ? 'Recibiendo pedidos' : 'Fuera de servicio' }}</span>
              </div>
              <button class="toggle-btn" (click)="toggleOpen()">
                {{ restaurantForm.isOpen ? 'Pausar Servicio' : 'Activar Servicio' }}
              </button>
            </div>
          </header>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Pedidos Hoy</span>
              <span class="stat-value">{{ orders.length }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Platillos Activos</span>
              <span class="stat-value">{{ products.length }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Rating Promedio</span>
              <span class="stat-value">4.8 ★</span>
            </div>
          </div>

          <div class="dashboard-grid">
            <article class="info-card">
              <h3>Actividad Reciente</h3>
              <div class="empty-mini">No hay notificaciones nuevas por ahora.</div>
            </article>

            <article class="info-card">
              <h3>Guía de Inicio</h3>
              <ul class="todo-list">
                @if (!hasRestaurant) {
                  <li><span class="dot warning"></span> Configura el perfil de tu negocio</li>
                }
                @if (!products.length) {
                  <li><span class="dot warning"></span> Agrega tus primeros platillos</li>
                }
                <li><span class="dot info"></span> Revisa los pedidos pendientes</li>
              </ul>
            </article>
          </div>
        </div>
      }

      <!-- ══ SECTION: ORDERS ══ -->
      @if (currentSection() === 'orders') {
        <div class="section-container">
          <header class="section-header">
            <div>
              <h1>Gestión de Pedidos</h1>
              <p>Atiende y actualiza el estado de tus pedidos entrantes.</p>
            </div>
            <button class="refresh-btn" (click)="loadOrders()" [disabled]="loadingOrders">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.25L21 8m0-5v5h-5"/></svg>
              {{ loadingOrders ? 'Actualizando...' : 'Recargar' }}
            </button>
          </header>

          @if (!orders.length) {
            <div class="empty-view">
              <div class="empty-icon">📬</div>
              <h3>Sin pedidos nuevos</h3>
              <p>Cuando recibas un pedido, aparecerá aquí para que lo prepares.</p>
            </div>
          } @else {
            <div class="orders-grid">
              @for (order of orders; track order.id) {
                <div class="order-card" [class.order-card--new]="order.status === 'PENDING'">
                  <div class="order-card__body">
                    <div class="order-main-info">
                      <div class="order-badge">#{{ order.id }}</div>
                      <div class="order-meta">
                        <span class="order-time">{{ order.created_at | date:'shortTime' }}</span>
                        <strong class="order-title">{{ order.customer_name || 'Cliente' }}</strong>
                        <span class="order-address">📍 {{ order.delivery_address }}</span>
                      </div>
                    </div>
                    
                    <div class="order-status">
                      <span [class]="'status-chip ' + statusClass(order.status)">
                        {{ statusLabel(order.status) }}
                      </span>
                    </div>

                    <div class="order-total-price">
                      \${{ order.total }}
                    </div>
                  </div>

                  <div class="order-details-tray">
                    @if (!itemsMap[order.id]) {
                      <div class="detail-loader">Cargando platillos...</div>
                    } @else {
                      @for (item of itemsMap[order.id]; track item.id) {
                        <div class="detail-item">
                          <span class="qty">{{ item.quantity }}x</span>
                          <span class="name">{{ item.product_name }}</span>
                        </div>
                      }
                    }
                  </div>
                  
                  @if (order.driver_name) {
                    <div class="order-driver-info">
                      <span class="driver-icon">🛵</span>
                      <div class="driver-text">
                        <small>Entregado por:</small>
                        <strong>{{ order.driver_name }}</strong>
                      </div>
                    </div>
                  }

                  <div class="order-card__actions">
                    @if (canAcceptOrder(order.status)) {
                      <button class="action-btn action-btn--success" (click)="updateOrderStatus(order.id, 'ACCEPTED')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        Aceptar
                      </button>
                    }
                    @if (canMarkReady(order.status)) {
                      <button class="action-btn action-btn--primary" (click)="updateOrderStatus(order.id, 'READY_FOR_PICKUP')">
                        🍽️ Listo para Entrega
                      </button>
                    }
                    @if (canRejectOrder(order.status)) {
                      <button class="action-btn action-btn--ghost" (click)="startReject(order.id)">
                        Rechazar
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ══ SECTION: PRODUCTS (MENU) ══ -->
      @if (currentSection() === 'products') {
        <div class="section-container">
          <header class="section-header">
            <div>
              <h1>Menú de Platillos</h1>
              <p>Agrega, edita o pausa la visibilidad de tus platillos.</p>
            </div>
            <button class="add-btn" (click)="showAddProduct = !showAddProduct">
              {{ showAddProduct ? 'Cerrar' : '+ Nuevo Platillo' }}
            </button>
          </header>
          @if (showAddProduct) {
            <div class="product-form-card anim-slide-down">
              <div class="form-title">
                <h3>{{ editingProductId ? 'Editar Platillo' : 'Nuevo Platillo' }}</h3>
                @if (editingProductId) {
                  <button class="btn--ghost btn--sm" (click)="cancelEdit()">Cancelar</button>
                }
              </div>
              <div class="form-split">
                <div class="image-dropzone">
                  <div class="dropzone-content">
                    @if (productForm.imageUrl) {
                      <img [src]="productForm.imageUrl" class="preview-img" />
                    } @else {
                      <div class="drop-icon">📸</div>
                      <span>Subir Foto del Platillo</span>
                    }
                  </div>
                  <input type="text" [(ngModel)]="productForm.imageUrl" name="imgUrl" placeholder="URL de imagen (opcional)" class="mini-input" />
                </div>

                <form (submit)="saveProduct($event)" class="grid-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Nombre del Platillo</label>
                      <input type="text" [(ngModel)]="productForm.name" name="name" placeholder="Ej. Hamburguesa Doble" required />
                    </div>
                    <div class="form-group">
                      <label>Precio</label>
                      <input type="number" [(ngModel)]="productForm.price" name="price" placeholder="0.00" required />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Categoría</label>
                    <input type="text" [(ngModel)]="productForm.category" name="category" placeholder="Ej. Entradas, Postres..." />
                  </div>
                  <div class="form-group">
                    <label>Descripción</label>
                    <textarea [(ngModel)]="productForm.description" name="description" placeholder="Ingredientes, porción..."></textarea>
                  </div>
                  <button type="submit" class="submit-btn" [disabled]="savingProduct">
                    {{ savingProduct ? 'Guardando...' : (editingProductId ? 'Actualizar Platillo' : 'Publicar Platillo') }}
                  </button>
                </form>
              </div>
            </div>
          }

          <div class="product-list-grid">
            @for (p of products; track p.id) {
              <div class="admin-product-card" [class.editing]="editingProductId === p.id">
                <div class="p-img">
                  @if (p.image_url) { <img [src]="p.image_url" /> }
                  @else { <span>🍔</span> }
                </div>
                <div class="p-details">
                  <div class="p-main">
                    <strong>{{ p.name }}</strong>
                    <span class="p-category">{{ p.category }}</span>
                  </div>
                  <span class="p-price">\${{ asPrice(p.price) }}</span>
                </div>
                <div class="p-actions">
                  <button class="edit-btn" (click)="startEdit(p)">✎</button>
                  <button (click)="toggleAvailability(p)" [class.off]="!p.available">
                    {{ p.available ? 'Activo' : 'Pausado' }}
                  </button>
                  <button class="del-btn" (click)="deleteProduct(p.id)">✕</button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ══ SECTION: SETTINGS ══ -->
      @if (currentSection() === 'settings') {
        <div class="section-container">
          <header class="section-header">
            <div>
              <h1>Configuración</h1>
              <p>Ajusta la información pública y operativa de tu negocio.</p>
            </div>
          </header>

          <article class="settings-card">
            <form (submit)="saveRestaurant($event)" class="settings-form">
              <div class="form-group">
                <label>Nombre Comercial</label>
                <input type="text" [(ngModel)]="restaurantForm.name" name="rName" required />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Teléfono</label>
                  <input type="text" [(ngModel)]="restaurantForm.phone" name="rPhone" />
                </div>
                <div class="form-group">
                  <label>Dirección Física</label>
                  <input type="text" [(ngModel)]="restaurantForm.address" name="rAddress" required />
                </div>
              </div>
              <div class="form-group">
                <label>Descripción del Negocio</label>
                <textarea [(ngModel)]="restaurantForm.description" name="rDesc"></textarea>
              </div>
              <button type="submit" class="save-btn" [disabled]="savingRestaurant">Actualizar Información</button>
            </form>
          </article>
        </div>
      }

    </div>
  `,
  styles: `
    .dashboard-viewport { max-width: 1200px; margin: 0 auto; }
    .section-container { display: grid; gap: 2.5rem; animation: fadeIn 0.4s ease-out; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-end; }
    .section-header h1 { margin: 0; font-size: 2.2rem; font-weight: 900; letter-spacing: -0.03em; }
    .section-header p { margin: 0.3rem 0 0; color: var(--muted); font-weight: 500; font-size: 1.1rem; }

    /* Orders V2 */
    .orders-grid { display: grid; gap: 1.2rem; }
    .order-card { 
      background: white; border-radius: 28px; border: 1.5px solid var(--line); overflow: hidden;
      display: flex; flex-direction: column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .order-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.05); }
    .order-card--new { border-color: var(--primary); box-shadow: 0 10px 30px rgba(255,68,31,0.1); }
    
    .order-details-tray { padding: 1rem 1.5rem; background: #fafafa; border-top: 1.5px solid var(--line); border-bottom: 1.5px solid var(--line); display: grid; gap: 0.5rem; }
    .detail-loader { font-size: 0.8rem; color: var(--muted); font-weight: 600; text-align: center; padding: 0.5rem; }
    .detail-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; color: var(--ink); }
    .detail-item .qty { background: var(--primary-soft); color: var(--primary-strong); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800; }
    .detail-item .name { flex: 1; }

    .order-card__body { padding: 1.8rem; display: flex; align-items: center; gap: 2rem; }
    .order-main-info { display: flex; align-items: center; gap: 1.2rem; flex: 1; }
    .order-badge { background: var(--bg-app); padding: 0.6rem 1rem; border-radius: 14px; font-weight: 900; font-size: 1rem; color: var(--muted); }
    .order-card--new .order-badge { background: var(--primary-soft); color: var(--primary); }
    .order-meta { display: grid; gap: 4px; }
    .order-time { font-size: 0.8rem; font-weight: 700; color: var(--muted); text-transform: uppercase; }
    .order-title { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.02em; }

    .status-chip { 
      padding: 0.5rem 1.2rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; 
      background: var(--bg-app); color: var(--muted); border: 1px solid var(--line);
    }
    .status-chip.pending { background: #fffbeb; color: #92400e; border-color: #fde68a; }
    .status-chip.accepted { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
    .status-chip.ready { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

    .order-total-price { font-size: 1.6rem; font-weight: 950; color: var(--ink); min-width: 120px; text-align: right; }

    .order-card__actions { 
      padding: 1.2rem 1.8rem; background: #fafafa; border-top: 1.5px solid var(--line);
      display: flex; justify-content: flex-end; gap: 1rem;
    }
    .action-btn { 
      display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.6rem; border-radius: 99px; font-weight: 800; font-size: 0.9rem; cursor: pointer; border: none; transition: all 0.2s;
    }
    .action-btn svg { width: 18px; height: 18px; }
    .action-btn--success { background: #22c55e; color: white; box-shadow: 0 4px 12px rgba(34,197,94,0.2); }
    .action-btn--primary { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(255,68,31,0.2); }
    .action-btn--ghost { background: transparent; border: 2px solid var(--line); color: var(--muted); }
    .action-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Stats */
    .stats-grid { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
    .stat-card { background: white; padding: 1.5rem 2.5rem; border-radius: 24px; border: 1.5px solid var(--line); display: grid; gap: 6px; flex: 1; }
    .stat-label { font-size: 0.8rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 2.2rem; font-weight: 950; color: var(--ink); }

    /* Dashboard Summary */
    .dashboard-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; }
    .info-card { background: white; padding: 2rem; border-radius: 28px; border: 1.5px solid var(--line); }
    .info-card h3 { margin: 0 0 1.5rem; font-size: 1.2rem; font-weight: 850; letter-spacing: -0.02em; }
    
    .status-selector { display: flex; align-items: center; gap: 1.5rem; padding: 1.5rem; background: var(--bg-app); border-radius: 24px; border: 1.5px solid var(--line); min-width: 400px; }
    .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #ccc; }
    .status-selector.open .status-indicator { background: #22c55e; box-shadow: 0 0 12px #22c55e; }
    .status-info { flex: 1; display: grid; gap: 2px; }
    .status-info strong { font-size: 1.1rem; font-weight: 800; }
    .status-info span { font-size: 0.8rem; color: var(--muted); font-weight: 500; }
    .toggle-btn { background: var(--ink); color: white; border: none; padding: 0.7rem 1.4rem; border-radius: 99px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
    .toggle-btn:hover { filter: brightness(1.2); transform: scale(1.02); }

    .todo-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
    .todo-list li { display: flex; align-items: center; gap: 1rem; font-weight: 600; color: var(--ink); font-size: 0.95rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot.warning { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .dot.info { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }

    .empty-mini { padding: 2rem; text-align: center; color: var(--muted); background: #fafafa; border-radius: 16px; border: 1.5px dashed var(--line); font-weight: 500; font-size: 0.9rem; }
    .biz-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; background: var(--success-soft); color: var(--success); font-weight: 800; font-size: 0.75rem; margin-top: 1rem; }

    /* Products */
    .product-list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
    .admin-product-card { background: white; padding: 1.2rem; border-radius: 24px; border: 1.5px solid var(--line); display: flex; flex-direction: column; gap: 1.2rem; transition: all 0.2s; }
    .admin-product-card:hover { border-color: var(--primary-soft); box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    .p-img { height: 180px; background: var(--bg-app); border-radius: 18px; display: grid; place-items: center; font-size: 3rem; overflow: hidden; position: relative; }
    .p-img img { width: 100%; height: 100%; object-fit: cover; }
    .p-details { display: flex; justify-content: space-between; align-items: flex-start; }
    .p-main { display: grid; gap: 2px; }
    .p-category { font-size: 0.8rem; font-weight: 800; color: var(--muted); text-transform: uppercase; }
    .p-main strong { font-size: 1.1rem; font-weight: 800; }
    .p-price { font-weight: 900; color: var(--primary); font-size: 1.1rem; }
    .p-actions { display: flex; gap: 0.8rem; }
    .p-actions button { flex: 1; border: 1.5px solid var(--line); background: white; padding: 0.7rem; border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
    .p-actions button:hover { border-color: var(--ink); background: var(--bg-app); }
    .p-actions button.off { background: #eee; color: #999; border-color: #ddd; }
    .del-btn { max-width: 52px; color: #ef4444; border-color: #fee2e2 !important; }
    .del-btn:hover { background: #fee2e2 !important; }

    /* Forms */
    .settings-card, .product-form-card { background: white; padding: 3rem; border-radius: 32px; border: 1.5px solid var(--line); box-shadow: 0 10px 40px rgba(0,0,0,0.02); }
    .settings-card h3, .product-form-card h3 { margin: 0 0 2rem; font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; }
    .grid-form, .settings-form { display: grid; gap: 2rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .form-group { display: grid; gap: 0.6rem; }
    .form-group label { font-size: 0.9rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    input, textarea { padding: 1.2rem; border-radius: 16px; border: 1.5px solid var(--line); background: var(--bg-app); font-family: inherit; font-size: 1rem; font-weight: 500; transition: all 0.2s; }
    input:focus, textarea:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 4px var(--primary-soft); }
    .save-btn, .submit-btn { background: var(--ink); color: white; border: none; padding: 1.2rem; border-radius: 99px; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; }
    .save-btn:hover, .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    .form-split { display: grid; grid-template-columns: 340px 1fr; gap: 3rem; }
    .image-dropzone { display: flex; flex-direction: column; gap: 1rem; }
    .dropzone-content { 
      height: 300px; border: 2px dashed var(--line); border-radius: 24px; background: var(--bg-app);
      display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
      padding: 2rem; color: var(--muted); gap: 0.5rem; transition: all 0.2s; position: relative; overflow: hidden;
    }
    .drop-icon { font-size: 3rem; margin-bottom: 0.5rem; opacity: 0.4; }
    .dropzone-content span { font-weight: 800; font-size: 1rem; color: var(--ink); }
    .dropzone-content p { font-size: 0.8rem; font-weight: 500; margin: 0; }
    .preview-img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
    .order-address { font-size: 0.8rem; color: var(--muted); font-weight: 600; display: block; margin-top: 0.2rem; }
    .order-driver-info { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.5rem; background: var(--surface-alt); border-top: 1px solid var(--line); }
    .driver-icon { font-size: 1.5rem; }
    .driver-text { display: flex; flex-direction: column; }
    .driver-text small { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 800; }
    .driver-text strong { font-size: 0.9rem; color: var(--ink); }

    .mini-input { padding: 0.8rem 1.2rem; border-radius: 12px; font-size: 0.85rem; }

    .empty-view { text-align: center; padding: 6rem 2rem; background: white; border-radius: 32px; border: 2px dashed var(--line); }
    .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.3; }

    .add-btn { background: var(--primary); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 99px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
    .add-btn:hover { transform: scale(1.05); box-shadow: 0 4px 15px var(--primary-soft); }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }

    .form-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; border-bottom: 1.5px solid var(--line); padding-bottom: 1rem; }
    .form-title h3 { margin: 0 !important; font-size: 1.4rem; font-weight: 850; }
    
    .p-actions { display: flex; gap: 0.5rem; align-items: center; }
    .edit-btn { background: #eff6ff; color: #1d4ed8; padding: 0.5rem 0.8rem; border-radius: 10px; border: 1.5px solid #bfdbfe; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
    .edit-btn:hover { background: #dbeafe; transform: scale(1.1); }
    
    .admin-product-card.editing { border-color: #3b82f6; background: #f8faff; box-shadow: 0 10px 25px rgba(59,130,246,0.1); }
    .del-btn { background: #fef2f2; color: #b91c1c; padding: 0.5rem 0.8rem; border-radius: 10px; border: 1.5px solid #fee2e2; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
    .del-btn:hover { background: #fee2e2; color: #991b1b; }
    
    .btn--ghost { background: transparent; border: 1.5px solid var(--line); color: var(--muted); padding: 0.5rem 1rem; border-radius: 99px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
    .btn--sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
  `
})
export class RestaurantDashboardPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly currentSection = computed(() => {
    const url = this.route.snapshot.url;
    return url.length > 0 ? url[0].path : 'dashboard';
  });

  protected showAddProduct = false;
  protected readonly defaultProductImage = 'assets/placeholder-food.svg';

  protected restaurant: OwnedRestaurant | null = null;
  protected hasRestaurant = false;
  protected products: Product[] = [];
  protected orders: OrderSummary[] = [];
  protected itemsMap: Record<number, any[]> = {};
  protected loadingOrders = false;
  protected savingRestaurant = false;
  protected savingProduct = false;
  protected updatingOrderId: number | null = null;
  protected rejectingOrderId: number | null = null;
  protected rejectReasonDraft = '';

  protected message = '';
  protected errorMessage = '';

  protected restaurantForm = {
    name: '',
    address: '',
    description: '',
    phone: '',
    isOpen: true
  };

  protected productForm = {
    name: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: '',
    available: true
  };

  constructor() {}

  async ngOnInit() {
    await this.boot();
  }

  protected async toggleOpen() {
    this.restaurantForm.isOpen = !this.restaurantForm.isOpen;
    await this.saveRestaurant(new Event('submit'));
  }

  protected asPrice(value: number | string): string {
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
  }

  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      ACCEPTED: 'Aceptado',
      REJECTED: 'Rechazado',
      READY_FOR_PICKUP: 'Listo para recoger',
      ASSIGNED: 'Asignado',
      IN_TRANSIT: 'En camino',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado'
    };
    return map[status] ?? status;
  }

  protected statusClass(status: string): string {
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

  protected startReject(orderId: number): void {
    this.rejectingOrderId = orderId;
    this.rejectReasonDraft = '';
  }

  protected cancelReject(): void {
    this.rejectingOrderId = null;
    this.rejectReasonDraft = '';
  }

  protected async confirmReject(orderId: number): Promise<void> {
    const reason = this.rejectReasonDraft.trim() || 'Sin razón especificada';
    await this.updateOrderStatus(orderId, 'REJECTED', reason);
    this.rejectingOrderId = null;
    this.rejectReasonDraft = '';
  }

  private async boot(): Promise<void> {
    await Promise.all([this.loadRestaurant(), this.loadOrders()]);
  }

  protected async saveRestaurant(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';
    this.savingRestaurant = true;
    try {
      this.restaurant = await this.apiService.upsertMyRestaurant({
        name: this.restaurantForm.name.trim(),
        address: this.restaurantForm.address.trim(),
        description: this.restaurantForm.description.trim() || undefined,
        phone: this.restaurantForm.phone.trim() || undefined,
        isOpen: this.restaurantForm.isOpen
      });
      this.hasRestaurant = true;
      this.message = 'Restaurante guardado correctamente.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo guardar el restaurante.');
    } finally {
      this.savingRestaurant = false;
    }
  }

  protected editingProductId: number | null = null;

  protected startEdit(p: Product) {
    this.editingProductId = p.id;
    this.productForm = {
      name: p.name,
      description: p.description ?? '',
      price: typeof p.price === 'string' ? Number.parseFloat(p.price) : p.price,
      category: p.category ?? '',
      imageUrl: p.image_url ?? '',
      available: p.available
    };
    this.showAddProduct = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected cancelEdit() {
    this.editingProductId = null;
    this.productForm = { name: '', price: 0, category: '', description: '', imageUrl: '', available: true };
    this.showAddProduct = false;
  }

  protected async saveProduct(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      const payload = {
        name: this.productForm.name.trim(),
        price: Number(this.productForm.price),
        category: this.productForm.category.trim() || undefined,
        description: this.productForm.description.trim() || undefined,
        imageUrl: this.productForm.imageUrl.trim() || undefined,
        available: this.productForm.available
      };

      if (this.editingProductId) {
        await this.apiService.updateMyRestaurantProduct(this.editingProductId, payload);
        this.message = 'Platillo actualizado correctamente.';
      } else {
        await this.apiService.createMyRestaurantProduct(payload);
        this.message = 'Platillo publicado correctamente.';
      }

      this.cancelEdit();
      await this.loadProducts();
      setTimeout(() => this.message = '', 3000);
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo guardar el platillo.');
    } finally {
      this.savingProduct = false;
    }
  }

  protected async toggleAvailability(product: Product): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      await this.apiService.updateMyRestaurantProduct(product.id, { available: !product.available });
      this.message = 'Disponibilidad actualizada.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar la disponibilidad.');
    } finally {
      this.savingProduct = false;
    }
  }

  protected async deleteProduct(productId: number): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.savingProduct = true;
    try {
      await this.apiService.deleteMyRestaurantProduct(productId);
      this.message = 'Platillo eliminado.';
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo eliminar el platillo.');
    } finally {
      this.savingProduct = false;
    }
  }

  protected async loadOrders(): Promise<void> {
    this.loadingOrders = true;
    this.errorMessage = '';
    try {
      this.orders = await this.apiService.getMyOrders();
      // Auto-load items for new orders
      for (const order of this.orders) {
        if (!this.itemsMap[order.id]) {
          void this.apiService.getOrderItems(order.id).then(items => {
            this.itemsMap[order.id] = items;
          });
        }
      }
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar pedidos.');
    } finally {
      this.loadingOrders = false;
    }
  }

  protected canAcceptOrder(status: string): boolean {
    return status === 'PENDING';
  }

  protected canRejectOrder(status: string): boolean {
    return status === 'PENDING';
  }

  protected canMarkReady(status: string): boolean {
    return status === 'ACCEPTED';
  }

  protected async updateOrderStatus(
    orderId: number,
    status: 'ACCEPTED' | 'REJECTED' | 'READY_FOR_PICKUP',
    reason?: string
  ): Promise<void> {
    this.errorMessage = '';
    this.message = '';
    this.updatingOrderId = orderId;
    try {
      await this.apiService.updateOrderStatus(orderId, {
        status,
        reason: reason ?? (status === 'REJECTED' ? 'Sin razón especificada' : undefined)
      });
      this.message = `Pedido #${orderId} actualizado a ${this.statusLabel(status)}.`;
      await this.loadOrders();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo actualizar el pedido.');
    } finally {
      this.updatingOrderId = null;
    }
  }

  private async loadRestaurant(): Promise<void> {
    this.errorMessage = '';
    try {
      this.restaurant = await this.apiService.getMyRestaurant();
      this.hasRestaurant = Boolean(this.restaurant);
      if (!this.restaurant) return;

      this.restaurantForm = {
        name: this.restaurant.name,
        address: this.restaurant.address,
        description: this.restaurant.description ?? '',
        phone: this.restaurant.phone ?? '',
        isOpen: this.restaurant.is_open
      };
      await this.loadProducts();
    } catch (error) {
      this.errorMessage = this.toErrorMessage(error, 'No se pudo cargar restaurante.');
    }
  }

  private async loadProducts(): Promise<void> {
    this.products = await this.apiService.getMyRestaurantProducts();
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
