import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from '@/app.routes';
import {
  Meta,
  Title,
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { authTokenInterceptor } from '@/core/interceptors/auth-token.interceptor';
import { refreshInterceptor } from '@/core/interceptors/refresh.interceptor';
import { provideI18n } from '@/core/i18n/i18n.providers';
import { environment } from '@env';

/**
 * Metadatos de marca que se aplican al arrancar la aplicación.
 *
 * `src/index.html` ya los trae escritos, y eso es lo que ven los bots que no
 * ejecutan JavaScript. Esto es la otra mitad: cuando Angular arranca —también
 * en SSR— fija el título y la descripción con los servicios nativos, de modo
 * que una ruta sin SEO propio (`/auth`, `/mantenimiento`, un 404) no se quede
 * con el título de la página anterior. Las vistas que sí declaran SEO lo
 * sobrescriben después con `SeoService`.
 */
const DEFAULT_TITLE = 'Impulso Jobs | Conectando Talento y Empresas';
const DEFAULT_DESCRIPTION =
  'En Impulso Jobs creemos que el capital humano correcto transforma empresas y el empleo correcto transforma vidas. Llevamos 11 años conectando talento con las mejores empresas.';

function applyDefaultMetadata(): void {
  const title = inject(Title);
  const meta = inject(Meta);

  title.setTitle(DEFAULT_TITLE);
  meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });

  // Open Graph: las redes sociales leen estas etiquetas al compartir el enlace.
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:site_name', content: 'Impulso Jobs' });
  meta.updateTag({ property: 'og:title', content: DEFAULT_TITLE });
  meta.updateTag({ property: 'og:description', content: DEFAULT_DESCRIPTION });
  meta.updateTag({ property: 'og:url', content: `${environment.siteUrl}/` });
  meta.updateTag({
    property: 'og:image',
    content: `${environment.siteUrl}/assets/images/logos/logo_naranja.png`,
  });
  meta.updateTag({ name: 'twitter:card', content: 'summary' });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(applyDefaultMetadata),
    /**
 * `scrollPositionRestoration: 'top'` es lo que hace que, al navegar, la página
 * empiece arriba.
 *
 * Sin esto, un enlace del pie —que está al final de una página larga— te deja en
 * la misma posición al cambiar de vista: la ruta nueva carga pero el scroll se
 * queda donde estabas, y parece que el enlace no funciona. Hay que subir
 * a mano para confirmar que sí cambió.
 *
 * `anchorScrolling` acompaña al anterior porque hay enlaces que apuntan a una
 * sección concreta (`/legal/aviso-de-privacidad#finalidades`): sin esto el
 * destino se alcanzaría pero siempre en el inicio de la página.
 */
provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authTokenInterceptor, refreshInterceptor]),
    ),
    provideI18n(),
  ]
};
