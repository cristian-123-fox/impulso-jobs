import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from '@/app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authTokenInterceptor } from '@/core/interceptors/auth-token.interceptor';
import { refreshInterceptor } from '@/core/interceptors/refresh.interceptor';
import { provideI18n } from '@/core/i18n/i18n.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
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
