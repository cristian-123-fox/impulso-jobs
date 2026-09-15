import { ConfigService } from '@nestjs/config';
import { ConsoleMailerAdapter } from '@/common/mailer/console-mailer.adapter';
import { createMailerAdapter } from '@/common/mailer/mailer.module';
import { ResendMailerAdapter } from '@/common/mailer/resend-mailer.adapter';
import { SmtpMailerAdapter } from '@/common/mailer/smtp-mailer.adapter';

// `jest.mock` se iza por encima de estas constantes: sólo se pueden
// referenciar dentro de la factoría si el nombre empieza por `mock`.
const mockSend = jest.fn();
const mockConstructor = jest.fn();

jest.mock('resend', () => ({
  Resend: class {
    readonly emails = { send: mockSend };
    constructor(key?: string) {
      mockConstructor(key);
    }
  },
}));

function buildConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

describe('ResendMailerAdapter', () => {
  const mail = {
    to: 'persona@test.io',
    subject: 'Verifica tu correo',
    html: '<p>hola</p>',
  };

  beforeEach(() => {
    mockSend.mockReset();
    mockConstructor.mockReset();
    mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
  });

  function buildAdapter(
    env: Record<string, string | undefined> = {},
  ): ResendMailerAdapter {
    return new ResendMailerAdapter(
      buildConfig({ RESEND_API_KEY: 're_test_key', ...env }),
    );
  }

  it('construye el cliente con la clave de la configuración', () => {
    buildAdapter();

    expect(mockConstructor).toHaveBeenCalledWith('re_test_key');
  });

  it('envía el correo por el SDK con el remitente configurado', async () => {
    await buildAdapter({
      MAIL_FROM: 'Impulso <no-reply@impulsojobs.com>',
    }).send(mail);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0]).toEqual({
      from: 'Impulso <no-reply@impulsojobs.com>',
      to: ['persona@test.io'],
      subject: 'Verifica tu correo',
      html: '<p>hola</p>',
    });
  });

  it('añade replyTo sólo si está configurado', async () => {
    await buildAdapter({ MAIL_REPLY_TO: 'hola@impulsojobs.com' }).send(mail);
    expect(mockSend.mock.calls[0][0].replyTo).toBe('hola@impulsojobs.com');

    mockSend.mockClear();
    await buildAdapter().send(mail);
    expect(mockSend.mock.calls[0][0]).not.toHaveProperty('replyTo');
  });

  it('cae al remitente de SMTP_FROM si no hay MAIL_FROM', async () => {
    await buildAdapter({ SMTP_FROM: 'legado@impulsojobs.com' }).send(mail);

    expect(mockSend.mock.calls[0][0].from).toBe('legado@impulsojobs.com');
  });

  it('corta la petición con un AbortSignal para no colgar la operación', async () => {
    await buildAdapter().send(mail);

    expect(mockSend.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('no propaga el error si Resend responde con fallo', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'domain is not verified' },
    });

    await expect(buildAdapter().send(mail)).resolves.toBeUndefined();
  });

  it('no propaga el error si la petición falla', async () => {
    mockSend.mockRejectedValue(new Error('network down'));

    await expect(buildAdapter().send(mail)).resolves.toBeUndefined();
  });
});

describe('createMailerAdapter', () => {
  it('usa Resend cuando hay RESEND_API_KEY, aunque también haya SMTP', () => {
    const adapter = createMailerAdapter(
      buildConfig({ RESEND_API_KEY: 're_test_key', SMTP_HOST: 'smtp.test.io' }),
    );

    expect(adapter).toBeInstanceOf(ResendMailerAdapter);
  });

  it('usa SMTP cuando sólo hay SMTP_HOST', () => {
    const adapter = createMailerAdapter(
      buildConfig({ SMTP_HOST: 'smtp.test.io' }),
    );

    expect(adapter).toBeInstanceOf(SmtpMailerAdapter);
  });

  it('cae a consola cuando no hay nada configurado', () => {
    const adapter = createMailerAdapter(buildConfig({}));

    expect(adapter).toBeInstanceOf(ConsoleMailerAdapter);
  });
});
