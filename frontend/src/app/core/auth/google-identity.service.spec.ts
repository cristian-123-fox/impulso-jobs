import { TestBed } from '@angular/core/testing';
import { GoogleIdentityService } from './google-identity.service';
import { ThirdPartyGateService } from '@/core/consent/third-party-gate.service';

interface CredentialCallbackConfig {
  client_id: string;
  callback: (r: { credential: string }) => void;
  lang?: string;
}

/**
 * GIS no admite reemplazar la inicialización: `initialize()` una segunda vez
 * avisa por consola («is called multiple times…») y deja de valer el `callback`
 * anterior. El formulario de login se recrea en cada visita a `/auth/login`, así
 * que el servicio tiene que inicializar una sola vez y despachar siempre al
 * manejador más reciente.
 */
describe('GoogleIdentityService', () => {
  let initialize: jasmine.Spy;
  let renderButton: jasmine.Spy;

  beforeEach(() => {
    initialize = jasmine.createSpy('initialize');
    renderButton = jasmine.createSpy('renderButton');
    (window as unknown as { google: unknown }).google = {
      accounts: { id: { initialize, renderButton } },
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThirdPartyGateService,
          useValue: { allows: () => true, loadScript: () => Promise.resolve() },
        },
      ],
    });
  });

  afterEach(() => {
    delete (window as unknown as { google?: unknown }).google;
  });

  it('inicializa GIS una sola vez aunque se repinte el botón', () => {
    const service = TestBed.inject(GoogleIdentityService);

    service.renderButton(document.createElement('div'), {
      clientId: 'cliente',
      lang: 'es',
      onCredential: () => undefined,
    });
    service.renderButton(document.createElement('div'), {
      clientId: 'cliente',
      lang: 'es',
      onCredential: () => undefined,
    });

    expect(initialize).toHaveBeenCalledTimes(1);
    // El botón sí se repinta: lo que no se repite es la inicialización.
    expect(renderButton).toHaveBeenCalledTimes(2);
  });

  it('entrega la credencial al manejador de la última pintura', () => {
    const service = TestBed.inject(GoogleIdentityService);
    const primera = jasmine.createSpy('primera');
    const segunda = jasmine.createSpy('segunda');

    service.renderButton(document.createElement('div'), {
      clientId: 'cliente',
      lang: 'es',
      onCredential: primera,
    });
    service.renderButton(document.createElement('div'), {
      clientId: 'cliente',
      lang: 'es',
      onCredential: segunda,
    });

    // El callback registrado es el de la primera vez, el único que se puede
    // registrar: tiene que despachar al manejador que se acaba de pintar.
    const config = initialize.calls.first().args[0] as CredentialCallbackConfig;
    config.callback({ credential: 'token' });

    expect(segunda).toHaveBeenCalledWith('token');
    expect(primera).not.toHaveBeenCalled();
  });

  it('no hace nada si el script de GIS no llegó a cargarse', () => {
    delete (window as unknown as { google?: unknown }).google;
    const service = TestBed.inject(GoogleIdentityService);

    expect(() =>
      service.renderButton(document.createElement('div'), {
        clientId: 'cliente',
        lang: 'es',
        onCredential: () => undefined,
      }),
    ).not.toThrow();
    expect(initialize).not.toHaveBeenCalled();
  });
});