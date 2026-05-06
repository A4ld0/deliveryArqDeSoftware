import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-order-map',
  standalone: true,
  template: `<div #mapContainer class="map-container" [style.height]="height"></div>`,
  styles: `
    .map-container {
      height: 250px;
      width: 100%;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--line);
    }
    ::ng-deep .marker-icon { background: transparent; border: none; }
  `
})
export class OrderMapComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  @Input() driverLat:      number | string | null | undefined = null;
  @Input() driverLng:      number | string | null | undefined = null;
  @Input() restaurantLat:  number | string | null | undefined = null;
  @Input() restaurantLng:  number | string | null | undefined = null;
  @Input() deliveryLat:    number | string | null | undefined = null;
  @Input() deliveryLng:    number | string | null | undefined = null;
  @Input() deliveryAddress: string | null | undefined = null;
  @Input() height = '250px';

  private resolvedDeliveryLat: number | null = null;
  private resolvedDeliveryLng: number | null = null;
  private geocodingAddress = '';

  private map: L.Map | null = null;
  private driverMarker:     L.Marker | null = null;
  private restaurantMarker: L.Marker | null = null;
  private deliveryMarker:   L.Marker | null = null;
  private routeLine:        L.Polyline | null = null;
  private driverToDeliveryLine: L.Polyline | null = null;

  private n(v: number | string | null | undefined): number | null {
    if (v === null || v === undefined) return null;
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  private icon(emoji: string, bg: string) {
    return L.divIcon({
      className: 'marker-icon',
      html: `<div style="background:${bg};width:32px;height:32px;border-radius:50%;border:3px solid white;display:grid;place-items:center;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.25);">${emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    const rLat  = this.n(this.restaurantLat);
    const rLng  = this.n(this.restaurantLng);
    const deLat = this.n(this.deliveryLat);
    const deLng = this.n(this.deliveryLng);
    const drLat = this.n(this.driverLat);
    const drLng = this.n(this.driverLng);

    const initLat = drLat ?? rLat ?? deLat ?? 20.6597;
    const initLng = drLng ?? rLng ?? deLng ?? -103.3496;

    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true, attributionControl: false })
      .setView([initLat, initLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    if (deLat === null && deLng === null && this.deliveryAddress?.trim()) {
      void this.geocodeDeliveryAddress(this.deliveryAddress.trim());
    }

    this.updateMarkers();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (!this.map) return;

    const deLat = this.n(this.deliveryLat);
    if (deLat === null && this.deliveryAddress?.trim() && this.deliveryAddress !== this.geocodingAddress) {
      void this.geocodeDeliveryAddress(this.deliveryAddress.trim());
    }

    this.updateMarkers();
  }

  private async geocodeDeliveryAddress(address: string): Promise<void> {
    this.geocodingAddress = address;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=mx`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json() as Array<{ lat: string; lon: string }>;
      if (data.length === 0) return;
      this.resolvedDeliveryLat = Number(data[0].lat);
      this.resolvedDeliveryLng = Number(data[0].lon);
      this.updateMarkers();
    } catch { /* silent */ }
  }

  private updateMarkers(): void {
    if (!this.map) return;

    const rLat  = this.n(this.restaurantLat);
    const rLng  = this.n(this.restaurantLng);
    const deLat = this.n(this.deliveryLat) ?? this.resolvedDeliveryLat;
    const deLng = this.n(this.deliveryLng) ?? this.resolvedDeliveryLng;
    const drLat = this.n(this.driverLat);
    const drLng = this.n(this.driverLng);

    // Restaurant marker 🏪
    if (rLat !== null && rLng !== null) {
      if (!this.restaurantMarker) {
        this.restaurantMarker = L.marker([rLat, rLng], { icon: this.icon('🏪', '#ef4444') }).addTo(this.map);
      } else {
        this.restaurantMarker.setLatLng([rLat, rLng]);
      }
    }

    // Delivery / house marker 🏠
    if (deLat !== null && deLng !== null) {
      if (!this.deliveryMarker) {
        this.deliveryMarker = L.marker([deLat, deLng], { icon: this.icon('🏠', '#3b82f6') }).addTo(this.map);
      } else {
        this.deliveryMarker.setLatLng([deLat, deLng]);
      }
    }

    // Driver marker 🛵
    if (drLat !== null && drLng !== null) {
      if (!this.driverMarker) {
        this.driverMarker = L.marker([drLat, drLng], { icon: this.icon('🛵', '#f85c23') }).addTo(this.map);
      } else {
        this.driverMarker.setLatLng([drLat, drLng]);
        this.map.panTo([drLat, drLng]);
      }
    } else if (this.driverMarker) {
      this.driverMarker.remove();
      this.driverMarker = null;
    }

    // Route: restaurant → delivery (dashed gray)
    if (rLat !== null && rLng !== null && deLat !== null && deLng !== null) {
      const pts: L.LatLngExpression[] = [[rLat, rLng], [deLat, deLng]];
      if (!this.routeLine) {
        this.routeLine = L.polyline(pts, { color: '#94a3b8', weight: 3, dashArray: '8, 12' }).addTo(this.map);
      } else {
        this.routeLine.setLatLngs(pts);
      }
    } else if (this.routeLine) {
      this.routeLine.remove();
      this.routeLine = null;
    }

    // Route: driver → delivery (solid orange when driver exists)
    if (drLat !== null && drLng !== null && deLat !== null && deLng !== null) {
      const pts: L.LatLngExpression[] = [[drLat, drLng], [deLat, deLng]];
      if (!this.driverToDeliveryLine) {
        this.driverToDeliveryLine = L.polyline(pts, { color: '#f85c23', weight: 3, dashArray: '6, 8' }).addTo(this.map);
      } else {
        this.driverToDeliveryLine.setLatLngs(pts);
      }
    } else if (this.driverToDeliveryLine) {
      this.driverToDeliveryLine.remove();
      this.driverToDeliveryLine = null;
    }

    // Fit bounds to all visible markers
    const markers = [
      this.restaurantMarker,
      this.deliveryMarker,
      this.driverMarker
    ].filter((m): m is L.Marker => !!m);

    if (markers.length >= 2) {
      this.map.fitBounds(new L.FeatureGroup(markers).getBounds(), { padding: [50, 50] });
    } else if (markers.length === 1) {
      this.map.setView(markers[0].getLatLng(), 15);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
