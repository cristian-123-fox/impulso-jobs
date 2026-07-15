import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from '@/app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authTokenInterceptor } from '@/core/interceptors/auth-token.interceptor';
import { refreshInterceptor } from '@/core/interceptors/refresh.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authTokenInterceptor, refreshInterceptor]),
    ),
  ]
};
