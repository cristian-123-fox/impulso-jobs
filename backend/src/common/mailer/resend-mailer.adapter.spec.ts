import { ConfigService } from '@nestjs/config';
import { ConsoleMailerAdapter } from '@/common/mailer/console-mailer.adapter';
import { createMailerAdapter } from '@/common/mailer/mailer.module';
import { ResendMailerAdapter } from '@/common/mailer/resend-mailer.adapter';
import { SmtpMailerAdapter } from '@/common/mailer/smtp-mailer.adapter';

function buildConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

describe('ResendMailerAdapter', () => {
  const fetchMock = jest.fn();
  const mail = {
    to: 'persona@test.io',
    subject: 'Verifica tu correo',
    html: '<p>hola</p>',
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  function buildAdapter(
    env: Record<string, string | undefined> = {},
  ): ResendMailerAdapter {
    return new ResendMailerAdapter(
      buildConfig({ RESEND_API_KEY: 're_test_key', ...env }),
    );
  }

  it('envía el correo a la API de Resend con la clave y el remitente', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'msg-1' }),
    });

    await buildAdapter({
      MAIL_FROM: 'Impulso <no-reply@impulsojobs.com>',
    }).send(mail);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer re_test_key',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Impulso <no-reply@impulsojobs.com>',
      to: ['persona@test.io'],
      subject: 'Verifica tu correo',
      html: '<p>hola</p>',
    });
  });

  it('añade reply_to sólo si está configurado', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'msg-2' }),
    });

    await buildAdapter({ MAIL_REPLY_TO: 'hola@impulsojobs.com' }).send(mail);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).reply_to).toBe(
      'hola@impulsojobs.com',
    );
  });

  it('cae al remitente de SMTP_FROM si no hay MAIL_FROM', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'msg-3' }),
    });

    await buildAdapter({ SMTP_FROM: 'legado@impulsojobs.com' }).send(mail);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).from).toBe('legado@impulsojobs.com');
  });

  it('no propaga el error si Resend responde con fallo', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('{"message":"domain is not verified"}'),
    });

    await expect(buildAdapter().send(mail)).resolves.toBeUndefined();
  });

  it('no propaga el error si la petición falla', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

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
