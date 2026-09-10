import {
  normalizePublicBaseUrl,
  rehostUploadedFileUrl,
  resolveAppPublicUrl,
} from '@/common/storage/public-base-url';

describe('public-base-url', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.APP_PUBLIC_URL;
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('resolveAppPublicUrl', () => {
    it('usa APP_PUBLIC_URL sin la barra final', () => {
      process.env.APP_PUBLIC_URL = 'https://api.impulsojobs.com/';

      expect(resolveAppPublicUrl()).toBe('https://api.impulsojobs.com');
    });

    it('cae a localhost en desarrollo cuando falta la variable', () => {
      process.env.PORT = '4000';

      expect(resolveAppPublicUrl()).toBe('http://localhost:4000');
    });

    it('arranca en fallo en producción si falta la variable (T23)', () => {
      process.env.NODE_ENV = 'production';

      expect(() => resolveAppPublicUrl()).toThrow(/APP_PUBLIC_URL/);
    });

    it('rechaza una URL sin esquema aunque no sea producción', () => {
      process.env.APP_PUBLIC_URL = 'api.impulsojobs.com';

      expect(() => resolveAppPublicUrl()).toThrow(/inválida/);
    });
  });

  describe('normalizePublicBaseUrl', () => {
    it('acepta http y https y conserva puerto y ruta base', () => {
      expect(normalizePublicBaseUrl('http://localhost:3000')).toBe(
        'http://localhost:3000',
      );
      expect(normalizePublicBaseUrl('https://midominio.com/api/')).toBe(
        'https://midominio.com/api',
      );
    });

    it('rechaza esquemas que un navegador no puede pedir', () => {
      expect(() => normalizePublicBaseUrl('ftp://midominio.com')).toThrow();
    });
  });

  describe('rehostUploadedFileUrl', () => {
    const base = 'https://api.impulsojobs.com';
    const key = 'company-logos/f08e21b1-58f9-471c-8a41-b190efbd63f4.jpg';

    it('reescribe el host de un archivo nuestro', () => {
      expect(
        rehostUploadedFileUrl(`http://localhost:3000/uploads/${key}`, base),
      ).toBe(`${base}/uploads/${key}`);
    });

    it('devuelve null si ya apunta al host correcto', () => {
      expect(rehostUploadedFileUrl(`${base}/uploads/${key}`, base)).toBeNull();
    });

    it('ignora URLs externas y valores vacíos', () => {
      expect(
        rehostUploadedFileUrl('https://cdn.ajeno.com/logo.png', base),
      ).toBeNull();
      expect(rehostUploadedFileUrl(null, base)).toBeNull();
      expect(rehostUploadedFileUrl(undefined, base)).toBeNull();
    });
  });
});
