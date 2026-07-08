import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IjButton, IjLogo } from '@/shared/ui';

interface FooterColumn {
  readonly title: string;
  readonly links: readonly string[];
}

/** Pie de página del portal público: newsletter, columnas de enlaces y socials. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjLogo, IjButton],
  template: `
    <footer class="bg-ink-950 px-6 pb-10 text-footer-fg lg:px-[60px]">
      <!-- Newsletter -->
      <div class="mx-auto max-w-[1120px] -translate-y-10">
        <div
          class="flex flex-wrap items-center justify-between gap-8 rounded-xl bg-ink-card px-6 py-8 sm:px-11"
        >
          <p class="max-w-[420px] text-xl font-semibold leading-snug text-white">
            Suscríbete para recibir nuevas vacantes y notificaciones en tu correo.
          </p>
          <form
            class="flex min-w-[280px] max-w-[520px] flex-1 gap-3"
            (submit)="$event.preventDefault()"
          >
            <input
              type="email"
              required
              placeholder="Ingresa tu correo"
              aria-label="Correo electrónico"
              class="flex-1 rounded-lg border-0 px-4 py-3.5 text-sm text-body outline-none focus:ring-2 focus:ring-brand"
            />
            <button ij-button type="submit" shape="rounded">Suscribirme</button>
          </form>
        </div>
      </div>

      <!-- Columnas -->
      <div
        class="mx-auto grid max-w-[1120px] gap-8 pt-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]"
      >
        <div>
          <ij-logo variant="light" size="sm" />
          <p class="mb-4 mt-5 max-w-[280px] text-sm leading-relaxed text-footer-muted">
            Conectamos talento y empresas para impulsar tu próxima oportunidad
            profesional.
          </p>
          <p class="text-[13px] leading-[1.9] text-footer-muted">
            <span class="font-medium text-white">Dirección:</span> Bogotá,
            Colombia<br />
            <span class="font-medium text-white">Correo:</span>
            hola&#64;impulsojobs.com<br />
            <span class="font-medium text-white">Tel:</span> +57 555 555 1234
          </p>
        </div>

        @for (col of columns; track col.title) {
          <div>
            <h5 class="mb-5 text-base font-semibold text-white">{{ col.title }}</h5>
            <div class="flex flex-col gap-2.5">
              @for (link of col.links; track link) {
                <a
                  href="#"
                  class="text-sm text-footer-muted transition-colors hover:text-white"
                  >{{ link }}</a
                >
              }
            </div>
          </div>
        }
      </div>

      <!-- Barra inferior -->
      <div
        class="mx-auto mt-10 flex max-w-[1120px] flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6"
      >
        <p class="text-[13px] text-footer-muted">
          © {{ year }} Impulso Jobs. Todos los derechos reservados.
        </p>
        <div class="flex gap-2.5">
          @for (social of socials; track social) {
            <a
              href="#"
              [attr.aria-label]="social.label"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-footer-muted transition-colors hover:bg-brand hover:text-white"
              >{{ social.short }}</a
            >
          }
        </div>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = 2026;

  protected readonly columns: readonly FooterColumn[] = [
    {
      title: 'Candidatos',
      links: ['Mi panel', 'Alertas de empleo', 'Perfil', 'Hoja de vida', 'Blog'],
    },
    {
      title: 'Empresas',
      links: [
        'Publicar empleo',
        'Buscar talento',
        'Planes',
        'Mis vacantes',
        'Contacto',
      ],
    },
    {
      title: 'Recursos',
      links: ['Preguntas frecuentes', 'Ayuda', 'Términos', 'Privacidad', 'Precios'],
    },
    {
      title: 'Enlaces',
      links: ['Inicio', 'Sobre nosotros', 'Empleos', 'Empresas', 'Contacto'],
    },
  ];

  protected readonly socials: readonly { label: string; short: string }[] = [
    { label: 'Facebook', short: 'f' },
    { label: 'X', short: 'X' },
    { label: 'LinkedIn', short: 'in' },
    { label: 'Pinterest', short: 'P' },
    { label: 'Instagram', short: 'ig' },
  ];
}
