import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-picker',
  standalone: true,
  template: `
    <div class="picker-wrap">
      <!-- Address search bar -->
      <div class="search-row">
        <div class="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            [value]="searchInput"
            (input)="searchInput = $any($event.target).value"
            (keyup.enter)="geocodeSearch()"
            placeholder="Buscar dirección (Ej: Av. Patria, Guadalajara)..."
            class="search-input"
          />
        </div>
        <button type="button" class="search-btn" (click)="geocodeSearch()" [disabled]="geocoding">
          @if (geocoding) {
            <span class="spinner"></span>
          } @else {
            Buscar
          }
        </button>
      </div>

      @if (geocodeError) {
        <p class="geo-error">{{ geocodeError }}</p>
      }

      <!-- Map container -->
      <div class="picker-container">
        <div #mapContainer class="map-picker"></div>

        <div class="coord-badge">
          <span class="dot"></span>
          {{ currentLat.toFixed(5) }}, {{ currentLng.toFixed(5) }}
        </div>

        <div class="center-pin">
          <div class="pin-icon">📍</div>
          <div class="pin-shadow"></div>
        </div>

        <div class="map-hint">Mueve el mapa para ajustar el pin</div>
      </div>
    </div>
  `,
  styles: `
    .picker-wrap { display: grid; gap: 0.75rem; }

    .search-row { display: flex; gap: 0.5rem; }

    .search-field {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--panel);
      border: 1.5px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0 0.85rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .search-field:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(248, 92, 35, 0.1);
    }

    .search-field svg { width: 1rem; height: 1rem; color: var(--muted); flex-shrink: 0; }

    .search-input {
      flex: 1;
      border: 0;
      outline: none;
      background: none;
      font: inherit;
      font-size: 0.9rem;
      color: var(--ink);
      padding: 0.65rem 0;
      min-width: 0;
    }

    .search-input::placeholder { color: var(--muted-2); }

    .search-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--primary);
      color: #fff;
      font-weight: 700;
      font-size: 0.85rem;
      font-family: inherit;
      padding: 0.65rem 1rem;
      cursor: pointer;
      white-space: nowrap;
      transition: box-shadow 0.15s;
      flex-shrink: 0;
    }

    .search-btn:hover:not([disabled]) { box-shadow: 0 4px 14px rgba(248, 92, 35, 0.3); }
    .search-btn[disabled] { opacity: 0.6; cursor: not-allowed; }

    .geo-error {
      margin: 0;
      font-size: 0.8rem;
      color: var(--danger);
      font-weight: 600;
    }

    /* ── Map ── */
    .picker-container {
      position: relative;
      height: 300px;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1.5px solid var(--line);
      box-shadow: var(--shadow-sm);
    }

    .map-picker { height: 100%; width: 100%; }

    .coord-badge {
      position: absolute;
      top: 0.75rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
      background: rgba(17, 24, 39, 0.82);
      backdrop-filter: blur(10px);
      color: #fff;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      white-space: nowrap;
    }

    .dot {
      width: 7px;
      height: 7px;
      background: #34d399;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px #34d399;
    }

    .center-pin {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pin-icon {
      font-size: 2.2rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
      animation: pin-float 2s ease-in-out infinite;
    }

    .pin-shadow {
      width: 8px;
      height: 3px;
      background: rgba(0,0,0,0.2);
      border-radius: 50%;
      filter: blur(2px);
      margin-top: -4px;
    }

    .map-hint {
      position: absolute;
      bottom: 0.75rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      pointer-events: none;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius-xs);
      padding: 0.3rem 0.75rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--muted);
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .spinner {
      width: 0.85rem;
      height: 0.85rem;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pin-float {
      0%, 100% { transform: translateY(-3px); }
      50% { transform: translateY(-9px); }
    }
  `
})
export class LocationPickerComponent implements OnInit, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  @Input() lat: number | string = 20.6597;
  @Input() lng: number | string = -103.3496;
  @Input() address: string = '';
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();
  @Output() addressChange = new EventEmitter<string>();

  protected currentLat = 20.6597;
  protected currentLng = -103.3496;
  protected searchInput = '';
  protected geocoding = false;
  protected geocodeError = '';

  private map: L.Map | null = null;
  private ignoreMove = false;
  private userMoved = false;

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    this.currentLat = this.toNum(this.lat, 20.6597);
    this.currentLng = this.toNum(this.lng, -103.3496);

    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([this.currentLat, this.currentLng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.map.on('move', () => {
      if (!this.map || this.ignoreMove) return;
      const center = this.map.getCenter();
      this.currentLat = center.lat;
      this.currentLng = center.lng;
      this.locationChange.emit({ lat: this.currentLat, lng: this.currentLng });
      this.userMoved = true;
    });

    this.map.on('moveend', () => {
      if (!this.map || !this.userMoved) return;
      this.userMoved = false;
      void this.reverseGeocode(this.currentLat, this.currentLng);
    });

    // Always emit initial position so parents capture coords even before user interaction
    this.locationChange.emit({ lat: this.currentLat, lng: this.currentLng });

    if (this.address.trim()) {
      this.searchInput = this.address;
      void this.geocodeSearch();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['address'] && this.address.trim() && !changes['address'].firstChange && this.address !== this.searchInput) {
      this.searchInput = this.address;
      void this.geocodeSearch();
    }

    if ((changes['lat'] || changes['lng']) && !changes['lat']?.firstChange) {
      const lat = this.toNum(this.lat, 20.6597);
      const lng = this.toNum(this.lng, -103.3496);
      this.ignoreMove = true;
      this.map.setView([lat, lng], 16);
      this.currentLat = lat;
      this.currentLng = lng;
      setTimeout(() => { this.ignoreMove = false; }, 50);
    }
  }

  protected async geocodeSearch(): Promise<void> {
    const q = this.searchInput.trim();
    if (!q || !this.map) return;

    this.geocoding = true;
    this.geocodeError = '';

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=mx`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;

      if (data.length === 0) {
        this.geocodeError = 'No se encontró la dirección. Intenta ser más específico.';
        return;
      }

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);

      this.ignoreMove = true;
      this.map.setView([lat, lng], 17);
      this.currentLat = lat;
      this.currentLng = lng;
      this.locationChange.emit({ lat, lng });
      this.addressChange.emit(q);
      setTimeout(() => { this.ignoreMove = false; }, 100);
    } catch {
      this.geocodeError = 'Error al buscar la dirección.';
    } finally {
      this.geocoding = false;
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json() as { display_name?: string; address?: Record<string, string> };
      if (!data) return;
      const a = data.address;
      const parts = a ? [
        a['road'] || a['pedestrian'] || a['footway'],
        a['house_number'],
        a['suburb'] || a['neighbourhood'] || a['quarter'],
        a['city'] || a['town'] || a['municipality']
      ].filter(Boolean) : [];
      const addr = parts.length >= 2 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',').trim() ?? '');
      if (addr) {
        this.searchInput = addr;
        this.addressChange.emit(addr);
      }
    } catch {
      // Ignore reverse geocode errors silently
    }
  }

  private toNum(v: number | string, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
}
