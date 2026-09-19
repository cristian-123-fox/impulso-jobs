import { absoluteUrl, escapeHtml } from '@/common/mailer/email-layout';
import { EMAIL_COLORS } from '@/common/mailer/email-theme';
import {
  emailVerificationTemplate,
  notificationTemplate,
  passwordResetTemplate,
} from '@/common/mailer/mailer.templates';

const SITE = 'https://impulsojobs.mx';

describe('plantillas de correo', () => {
  const originalWebUrl = process.env.APP_WEB_URL;

  beforeEach(() => {
    process.env.APP_WEB_URL = `${SITE}/`;
  });

  afterAll(() => {
    if (originalWebUrl === undefined) delete process.env.APP_WEB_URL;
    else process.env.APP_WEB_URL = originalWebUrl;
  });

  describe('escapeHtml', () => {
    it('neutraliza el marcado y las comillas', () => {
      expect(escapeHtml('<b>"Dev" & co</b>')).toBe(
        '&lt;b&gt;&quot;Dev&quot; &amp; co&lt;/b&gt;',
      );
    });
  });

  describe('absoluteUrl', () => {
    it('deja pasar una URL absoluta', () => {
      expect(absoluteUrl('https://x.mx/a', SITE)).toBe('https://x.mx/a');
    });

    it('completa una ruta relativa con el host del portal', () => {
      // Es el defecto que arrastraban las notificaciones: sus enlaces se
      // guardan relativos y en una bandeja de entrada no resuelven.
      expect(absoluteUrl('/empresa/promociones', SITE)).toBe(
        `${SITE}/empresa/promociones`,
      );
      expect(absoluteUrl('empresa/promociones', SITE)).toBe(
        `${SITE}/empresa/promociones`,
      );
    });

    it('descarta esquemas que no son http(s)', () => {
      expect(absoluteUrl('javascript:alert(1)', SITE)).toBeNull();
      expect(absoluteUrl('   ', SITE)).toBeNull();
    });
  });

  describe('estructura común', () => {
    const rendered = passwordResetTemplate('https://impulsojobs.mx/r?t=1', 45);

    it('lleva asunto con la marca', () => {
      expect(rendered.subject).toBe('Restablece tu contraseña — Impulso Jobs');
    });

    it('lleva resumen de vista previa oculto', () => {
      expect(rendered.html).toContain('data-skip-in-text="true"');
      expect(rendered.html).toContain('Enlace válido 45 minutos');
    });

    it('rellena el botón con el naranja accesible, no con el de marca', () => {
      // El naranja base sobre blanco da 2.90:1 y no alcanza WCAG AA.
      expect(rendered.html).toContain(`bgcolor="${EMAIL_COLORS.brandStrong}"`);
    });

    it('pinta el isotipo con alt, porque las imágenes llegan bloqueadas', () => {
      expect(rendered.html).toContain('logo_naranja.png');
      expect(rendered.html).toContain('alt="Impulso Jobs"');
    });

    it('trae dirección postal en el pie', () => {
      expect(rendered.html).toContain('Paseo de la Reforma');
    });

    it('trae alternativa en texto plano con el enlace', () => {
      expect(rendered.text).toContain('RESTABLECE TU CONTRASEÑA');
      expect(rendered.text).toContain('https://impulsojobs.mx/r?t=1');
      expect(rendered.text).not.toContain('<');
    });

    it('ofrece el enlace en crudo por si el botón no funciona', () => {
      expect(rendered.html).toContain('copia y pega este enlace');
    });
  });

  describe('verificación de correo', () => {
    it('usa el singular cuando caduca en un minuto', () => {
      const rendered = emailVerificationTemplate('https://x.mx/v', 1);
      expect(rendered.html).toContain('caduca en 1 minuto.');
      expect(rendered.html).not.toContain('1 minutos');
    });
  });

  describe('notificación', () => {
    it('escapa el título y el cuerpo que vienen del dominio', () => {
      // Una vacante la titula la empresa: sin escapar, esto metería un enlace
      // ajeno en la bandeja de quien recibe el aviso.
      const rendered = notificationTemplate(
        'Denuncia de <b>"Dev"</b>',
        'Se denunció <a href="http://malo.mx">esta vacante</a> & otra',
        '/admin/denuncias',
      );

      expect(rendered.html).not.toContain('<a href="http://malo.mx"');
      expect(rendered.html).toContain('&lt;a href=&quot;http://malo.mx&quot;');
      expect(rendered.html).toContain('&lt;b&gt;&quot;Dev&quot;&lt;/b&gt;');
    });

    it('convierte el enlace relativo en absoluto', () => {
      const rendered = notificationTemplate(
        'Aviso',
        'Cuerpo',
        '/admin/denuncias',
      );

      expect(rendered.html).toContain(`href="${SITE}/admin/denuncias"`);
      expect(rendered.text).toContain(`${SITE}/admin/denuncias`);
    });

    it('omite el botón cuando la notificación no trae enlace', () => {
      const rendered = notificationTemplate('Aviso', 'Cuerpo');

      expect(rendered.html).not.toContain('Ver en Impulso Jobs');
      expect(rendered.subject).toBe('Aviso — Impulso Jobs');
    });

    it('no duplica la marca si el título ya la trae', () => {
      const rendered = notificationTemplate('Novedades de Impulso Jobs', 'x');
      expect(rendered.subject).toBe('Novedades de Impulso Jobs');
    });
  });
});
