import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-order-map',
  standalone: true,
  template: `<div #mapContainer class="map-container" role="img" [attr.aria-label]="'Mapa con ubicacion aproximada del repartidor. Latitud ' + lat + ', longitud ' + lng"></div>`,
  styles: `
    .map-container {
      height: 250px;
      width: 100%;
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-top: var(--space-3);
      border: 1px solid var(--line);
    }
    
    ::ng-deep .driver-marker {
      background: transparent;
      border: none;
    }
  `
})
export class OrderMapComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() lat!: number;
  @Input() lng!: number;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    this.map = L.map(this.mapContainer.nativeElement).setView([this.lat, this.lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const icon = L.divIcon({
      className: 'driver-marker',
      html: `<div style="background-color: var(--primary); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.marker = L.marker([this.lat, this.lng], { icon }).addTo(this.map);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && this.marker && (changes['lat'] || changes['lng'])) {
      const newPos = new L.LatLng(this.lat, this.lng);
      this.marker.setLatLng(newPos);
      this.map.panTo(newPos, { animate: true });
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
