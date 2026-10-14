import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginFacade } from './auth.facade';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { AuthService } from '@/core/auth/auth.service';
import { AppTranslateService } from '@/core/i18n/app-translate.service';

/**
 * El re-consentimiento por versión nueva (art. 7 LFPDPPP).
 *
 * La puerta vive en el backend, pero es la fachada quien tiene que entender el
 * `errorCode`: si lo tratara como un error genérico, la persona vería «algo salió
 * mal» y volvería a pulsar sin saber que hay que aceptar unos documentos.
 */
describe('LoginFacade · re-consentimiento', () => {
  let api: { login: jasmine.Spy; googleLogin: jasmine.Spy };
  let facade: LoginFacade;

  const session = {
    accessToken: 'a',
    refreshToken: 'r',
    user: { id: '1', email: 'a@b.com', role: 'CANDIDATE' as const },
  };

  const apiError = (status: number, errorCode: string): HttpErrorResponse =>
    new HttpErrorResponse({
      status,
      error: { success: false, statusCode: status, errorCode, message: 'x' },
    });

  const credentials = {
    email: 'a@b.com',
    password: 'Secreta#123',
    remember: false,
    accountType: 'candidate' as const,
  };

  beforeEach(() => {
    api = {
      login: jasmine.createSpy('login'),
      googleLogin: jasmine.createSpy('googleLogin'),
    };

    TestBed.configureTestingModule({
      providers: [
        LoginFacade,
        { provide: AuthApi, useValue: api },
        {
          provide: AuthService,
          useValue: {
            setSession: () => undefined,
            redirectUrlFor: () => '/candidato',
          },
        },
        {
          provide: Router,
          useValue: { navigateByUrl: jasmine.createSpy('navigateByUrl') },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: new Map() } },
        },
        { provide: AppTranslateService, useValue: { t: (key: string) => key } },
      ],
    });

    facade = TestBed.inject(LoginFacade);
  });

  it('arranca sin pedir re-consentimiento', () => {
    expect(facade.needsReconsent()).toBe(false);
  });

  it('no manda el bloque legal en un login normal', () => {
    api.login.and.returnValue(of(session));

    facade.login(credentials);

    expect(api.login).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
      legal: undefined,
    });
  });

  it('activa el re-consentimiento cuando el backend pide la versión nueva', () => {
    api.login.and.returnValue(
      throwError(() => apiError(409, 'LEGAL_VERSION_OUTDATED')),
    );

    facade.login(credentials);

    expect(facade.needsReconsent()).toBe(true);
    // Y no es el mensaje genérico: la persona tiene que saber qué hacer.
    expect(facade.errorMessage()).toBe('auth.errors.legalOutdated');
  });

  it('también lo activa viniendo de Google', () => {
    api.googleLogin.and.returnValue(
      throwError(() => apiError(409, 'LEGAL_VERSION_OUTDATED')),
    );

    facade.loginWithGoogle('credential', { documents: [] });

    expect(facade.needsReconsent()).toBe(true);
  });

  it('lo limpia cuando el reintento sí entra', () => {
    api.login.and.returnValue(
      throwError(() => apiError(409, 'LEGAL_VERSION_OUTDATED')),
    );
    facade.login(credentials);
    expect(facade.needsReconsent()).toBe(true);

    api.login.and.returnValue(of(session));
    facade.login({
      ...credentials,
      legal: { documents: [{ code: 'TERMS', version: '1.1.0', granted: true }] },
    });

    expect(facade.needsReconsent()).toBe(false);
  });

  it('un error de credenciales NO activa el re-consentimiento', () => {
    api.login.and.returnValue(
      throwError(() => apiError(401, 'AUTH_INVALID_CREDENTIALS')),
    );

    facade.login(credentials);

    expect(facade.needsReconsent()).toBe(false);
    expect(facade.errorMessage()).toBe('auth.errors.invalidCredentials');
  });
});