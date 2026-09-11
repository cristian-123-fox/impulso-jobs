import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { IjIcon } from '@/shared/ui';
import { ContactMapLocation } from '@/features/public/contact/models/contact.models';

/** Naranja de marca para el marcador. Leaflet pinta en canvas, no con Tailwind. */
const BRAND_COLOR = '#b3571d';

/**
 * Mapa de la oficina.
 *
 * Antes era un mapa **dibujado a mano con divs**: una cuadrícula de gradientes
 * y tres rectángulos rotados que simulaban calles, sin ninguna relación con un
 * lugar real. Y eso con `leaflet` ya instalado y en uso en el detalle de
 * vacante. Aquí se reutiliza ese mismo patrón: import dinámico (Leaflet toca
 * `window` al cargar, así que no puede entrar en el bundle de SSR) y
 * `circleMarker` en vez del marcador por defecto, cuyos PNG se rompen con el
 * bundler.
 */
@Component({
  selector: 'app-contact-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, TranslocoDirective],
  template: `
    <section *transloco="let t" class="px-6 pb-20 lg:px-[60px]">
      <div
        class="relative mx-auto h-[420px] max-w-[1240px] overflow-hidden rounded-[32px] bg-surface"
      >
        <div #map class="h-full w-full" role="img" [attr.aria-label]="mapLabel()"></div>

        <div
          class="pointer-events-none absolute right-6 top-6 z-[500] max-w-[280px] rounded-2xl bg-white px-5 py-4 shadow-float"
        >
          <p class="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <ij-icon name="map-pin" [size]="16" class="text-brand-strong" />
            {{ location().officeName }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ location().address }}</p>
          <a
            [href]="directionsUrl()"
            target="_blank"
            rel="noopener noreferrer"
            class="pointer-events-auto mt-2 inline-block text-xs font-semibold text-brand-strong hover:underline"
          >
            {{ t('contact.map.directions') }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ContactMap {
  readonly location = input.required<ContactMapLocation>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly transloco = inject(TranslocoService);
  private map: import('leaflet').Map | undefined;

  protected mapLabel(): string {
    return this.transloco.translate('contact.map.label', {
      office: this.location().officeName,
      address: this.location().address,
    });
  }

  protected directionsUrl(): string {
    const { lat, lng } = this.location();
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  }

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Sólo en el navegador: `afterNextRender` no corre en SSR/prerender.
    afterNextRender(() => {
      void this.initLeaflet();
    });

    destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = undefined;
    });
  }

  private async initLeaflet(): Promise<void> {
    // Leaflet es CJS: según el interop, el namespace puede venir en `default`.
    const mod = await import('leaflet');
    const L =
      (mod as unknown as { default?: typeof import('leaflet') }).default ?? mod;
    if (this.map) return;

    const { lat, lng } = this.location();
    this.map = L.map(this.mapEl().nativeElement, {
      scrollWheelZoom: false,
      attributionControl: true,
    }).setView([lat, lng], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    L.circleMarker([lat, lng], {
      radius: 10,
      color: BRAND_COLOR,
      weight: 3,
      fillColor: BRAND_COLOR,
      fillOpacity: 0.35,
    }).addTo(this.map);
  }
}
