import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginFacade } from './auth.facade';
import { AuthApi } from '@/features/public/auth/data/auth.api';
import { AuthService } from '@/core/auth/auth.service';
import { AppTranslateService } from '@/core/i18n/app-translate.service';

describe('LoginFacade', () => {
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

  it('manda la pestaña y no manda documentos legales', () => {
    api.login.and.returnValue(of(session));

    facade.login(credentials);

    expect(api.login).toHaveBeenCalledWith({
      email: credentials.email,
      password: credentials.password,
      accountType: 'candidate',
    });
  });

  it('reintenta una vez en la pestaña correcta si la cuenta es del otro tipo', () => {
    api.login.and.returnValues(
      throwError(() => apiError(403, 'AUTH_WRONG_ACCOUNT_TYPE')),
      of(session),
    );

    facade.login(credentials);

    expect(api.login).toHaveBeenCalledTimes(2);
    expect(api.login.calls.argsFor(0)[0].accountType).toBe('candidate');
    expect(api.login.calls.argsFor(1)[0].accountType).toBe('company');
    expect(facade.status()).toBe('success');
  });

  it('un error de credenciales muestra el mensaje traducido', () => {
    api.login.and.returnValue(
      throwError(() => apiError(401, 'AUTH_INVALID_CREDENTIALS')),
    );

    facade.login(credentials);

    expect(facade.errorMessage()).toBe('auth.errors.invalidCredentials');
  });

  it('Google manda solo el credential, sin bloque legal', () => {
    api.googleLogin.and.returnValue(of(session));

    facade.loginWithGoogle('credential');

    expect(api.googleLogin).toHaveBeenCalledWith('credential');
  });
});
