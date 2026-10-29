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
 * El login no recaba consentimiento: los Términos y el Aviso se aceptan al
 * crear la cuenta. Este test evita que vuelva a colarse el bloque legal en la
 * pantalla de acceso.
 */
describe('LoginForm · sin consentimiento legal', () => {
  it('no renderiza el componente de casillas legales', () => {
    TestBed.configureTestingModule({
      imports: [LoginForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
        { provide: ConsentService, useValue: { allows: () => false } },
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

    const fixture = TestBed.createComponent(LoginForm);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('ij-legal-consent'),
    ).toBeNull();
  });
});
