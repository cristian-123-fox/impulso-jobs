import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IjButton, IjIcon } from '@/shared/ui';
import { IjReveal } from '@/shared/directives/reveal';
import { HomeCompany } from '@/features/public/home/models/home.models';

/** Cuántas empresas hacen que un muro de logos parezca un muro. */
const MIN_WALL = 3;

/**
 * Banda para empresas: la vía de conversión B2B del portal.
 *
 * Sustituye a la sección "Empresas destacadas", que mostraba cinco empresas
 * llamadas "Company Business" o "Company Name" cuyos logos eran capturas de
 * WhatsApp, y una franja de métricas inventadas ("10M+ usuarios activos al
 * día", "50M+ historias compartidas") para un portal que aún no ha abierto.
 *
 * El muro de logos ahora sale de las empresas con vacante real y sólo se
 * dibuja cuando hay suficientes para que se lea como un muro. Con menos, la
 * sección se queda en la propuesta para empresas, que siempre es cierta.
 */
@Component({
  selector: 'app-top-companies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, RouterLink, IjReveal, TranslocoDirective],
  template: `
    <section *transloco="let t" class="px-6 py-16 lg:px-[60px]">
      <div
        ijReveal
        class="mx-auto max-w-[1120px] overflow-hidden rounded-[28px] bg-ink-950 px-8 py-12 text-white sm:px-12 lg:px-16"
      >
        <div class="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 class="text-3xl font-bold leading-tight text-white sm:text-[36px]">
              {{ t('home.employers.title') }}
            </h2>
            <p class="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-footer-fg">
              {{ t('home.employers.body') }}
            </p>

            <ul class="mt-7 flex flex-col gap-3">
              @for (point of pointKeys; track point) {
                <li class="flex items-start gap-3 text-[15px] text-footer-fg">
                  <span
                    class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white"
                  >
                    <ij-icon name="check" [size]="12" [strokeWidth]="3" />
                  </span>
                  {{ t('home.employers.' + point) }}
                </li>
              }
            </ul>

            <div class="mt-8 flex flex-wrap gap-3">
              <a ij-button routerLink="/auth/registro/empresa" size="md">
                {{ t('home.employers.ctaPost') }}
              </a>
              <a
                ij-button
                routerLink="/planes"
                variant="white"
                size="md"
              >
                {{ t('home.employers.ctaPlans') }}
              </a>
            </div>
          </div>

          @if (showWall()) {
            <div>
              <p class="text-[13px] font-semibold tracking-wide text-footer-muted">
                {{ t('home.employers.wallTitle') }}
              </p>
              <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                @for (company of companies(); track company.name) {
                  <div
                    class="flex h-[76px] items-center justify-center rounded-2xl bg-white/[0.07] px-3 ring-1 ring-white/10"
                    [attr.title]="company.name"
                  >
                    @if (company.logoUrl && !broken().has(company.name)) {
                      <img
                        [src]="company.logoUrl"
                        [alt]="company.name"
                        class="max-h-10 max-w-full object-contain"
                        loading="lazy"
                        (error)="onLogoError(company.name)"
                      />
                    } @else {
                      <!-- Sin logo (o roto): monograma, no un hueco vacío. -->
                      <span class="text-center text-[13px] font-semibold text-white/85">
                        {{ company.name }}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class TopCompanies {
  readonly companies = input.required<readonly HomeCompany[]>();

  /** Sufijos de clave bajo `home.employers` (T26). */
  protected readonly pointKeys: readonly string[] = [
    'screening',
    'snapshot',
    'promotions',
  ];

  /** Logos que devolvieron 404: se recuerdan para no reintentar en cada render. */
  protected readonly broken = signal(new Set<string>());

  protected readonly showWall = computed(
    () => this.companies().length >= MIN_WALL,
  );

  protected onLogoError(name: string): void {
    this.broken.update((set) => new Set(set).add(name));
  }
}
