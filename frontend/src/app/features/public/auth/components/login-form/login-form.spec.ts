import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { ConsentService } from '@/core/consent/consent.service';
import { GoogleIdentityService } from '@/core/auth/google-identity.service';
import { LoginFacade } from '@/features/public/auth/data/auth.facade';
import { LoginForm } from '@/features/public/auth/components/login-form/login-form';

/**
 * Regresión de NG0951 en el acceso con Google.
 *
 * Google devuelve la credencial por un callback asíncrono que invoca
 * `acceptanceDocuments()`. Ese método consultaba un `viewChild.required` cuyo
 * bloque vive dentro del tramo de Google: cuando el tramo no se dibuja —sin
 * botón, con cookies que lo bloquean, o en la pestaña de empresa— la consulta
 * no encuentra el elemento y Angular lanza «Child query result is required but
 * no value is available». El botón de Google dejaba de funcionar y la página se
 * quedaba en blanco.
 *
 * La consulta debe ser tolerante: sin bloque dibujado devuelve una lista vacía
 * y el backend rechaza el alta con su propio mensaje de consentimiento, que es
 * el resultado correcto.
 */
describe('LoginForm · consentimiento en el acceso con Google', () => {
  const buildWithoutView = (): { acceptanceDocuments: () => unknown[] } => {
    TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
        { provide: ConsentService, useValue: { allows: () => true } },
        {
          provide: GoogleIdentityService,
          useValue: {
            load: () => Promise.resolve(),
            renderButton: () => undefined,
          },
        },
        { provide: LoginFacade, useValue: { loginWithGoogle: () => undefined } },
      ],
    });

    // Sin `detectChanges`: la vista no se crea, que es el estado que reventaba.
    const fixture = TestBed.createComponent(LoginForm);
    return fixture.componentInstance as unknown as {
      acceptanceDocuments: () => unknown[];
    };
  };

  it('no lanza cuando el bloque de consentimiento no está montado', () => {
    const form = buildWithoutView();
    expect(() => form.acceptanceDocuments()).not.toThrow();
    expect(form.acceptanceDocuments()).toEqual([]);
  });
});