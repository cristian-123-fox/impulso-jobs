import {
  EMAIL_COLORS as C,
  EMAIL_FONT,
  EMAIL_WIDTH,
  resolveMailBranding,
} from '@/common/mailer/email-theme';

/**
 * Maqueta común de los correos transaccionales: tarjeta blanca sobre fondo
 * `surface`, encabezado con el isotipo y el wordmark, filete de marca, cuerpo y
 * pie con la dirección postal.
 *
 * **Por qué tablas y estilos en línea, en 2026.** No es nostalgia: Gmail borra
 * el `<style>` en su app móvil, Outlook de escritorio renderiza con Word y ni
 * uno ni otro respetan flexbox ni grid. La maqueta de tablas anidadas con
 * `style=""` en cada celda es lo único que se ve igual en los tres clientes que
 * importan. Por eso no se "moderniza" este archivo.
 *
 * **El contenido no se escribe en HTML.** Cada correo se describe como una lista
 * de bloques (`heading`, `paragraph`, `button`…) y de ahí salen **dos**
 * versiones: la HTML y la de texto plano. Dos motivos: el texto plano es la
 * mitad de un correo `multipart/alternative` —sin él, varios filtros de spam
 * penalizan el envío— y, sobre todo, **los bloques escapan el texto**. Los
 * cuerpos de notificación interpolan datos que escriben los usuarios (el título
 * de una vacante, el nombre de un plan): sin escapar, una vacante titulada
 * `<a href="...">` metería un enlace ajeno en la bandeja de un administrador.
 */

export type EmailBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'button'; label: string; url: string }
  /** El enlace en crudo, para quien no pueda pulsar el botón. */
  | { kind: 'linkFallback'; url: string }
  | { kind: 'finePrint'; text: string }
  | { kind: 'divider' };

export interface EmailContent {
  subject: string;
  /**
   * Resumen que el cliente enseña junto al asunto. Sin él, Gmail rellena ese
   * hueco con lo primero que encuentre en el HTML — que suele ser «Impulso Jobs».
   */
  preheader: string;
  blocks: readonly EmailBlock[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  /** Alternativa en texto plano del mismo contenido. */
  text: string;
}

/** Escapa lo que va a parar a un nodo de texto o a un atributo. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Deja el enlace listo para una bandeja de entrada: **una ruta relativa no
 * funciona en un correo**, porque no hay página desde la que resolverla.
 *
 * Es un defecto real que arrastraban las notificaciones: sus enlaces se guardan
 * relativos (`/empresa/promociones`) porque dentro de la aplicación es lo
 * correcto, y llegaban tal cual al `href` del botón. Aquí se les pone delante el
 * host del portal. Un `javascript:` o cualquier otro esquema raro se descarta.
 */
export function absoluteUrl(url: string, siteUrl: string): string | null {
  const value = url.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${siteUrl}${value}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return `${siteUrl}/${value}`;
}

// ---------------------------------------------------------------------------
// Piezas de la maqueta
// ---------------------------------------------------------------------------

/**
 * Relleno invisible detrás del resumen. Sin él, el cliente sigue leyendo el
 * cuerpo para completar la línea de vista previa y acaba enseñando el texto del
 * encabezado. Los caracteres son de ancho cero: ocupan el hueco sin verse.
 */
const PREHEADER_PADDING = '&#8199;&#65279;&#847; '.repeat(60);

function preheaderHtml(text: string): string {
  return (
    `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;` +
    `max-height:0;max-width:0" data-skip-in-text="true">${escapeHtml(text)}` +
    `<div>${PREHEADER_PADDING}</div></div>`
  );
}

/**
 * Encabezado: isotipo y wordmark, centrados. El isotipo lleva `alt` con el
 * nombre **a propósito** — Gmail y Outlook bloquean las imágenes por defecto, y
 * con el alt la marca sigue leyéndose en ese primer render.
 */
function headerHtml(): string {
  const brand = resolveMailBranding();
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" width="${brand.logoWidth}" height="${brand.logoHeight}" alt="${escapeHtml(brand.name)}" style="display:inline-block;vertical-align:middle;border:0;outline:none;text-decoration:none;height:${brand.logoHeight}px;width:auto" />`
    : '';

  return `
              <tr>
                <td align="center" style="padding:28px 30px 22px">
                  <a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none">
                    ${logo}
                    <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${EMAIL_FONT};font-size:21px;font-weight:700;letter-spacing:-.2px;color:${C.inkStrong}">Impulso<span style="color:${C.brandStrong}">Jobs</span></span>
                  </a>
                </td>
              </tr>`;
}

/** Filete bajo el encabezado, con el tramo central en naranja de marca. */
function accentRuleHtml(): string {
  const side = Math.round((EMAIL_WIDTH - 120) / 2);
  return `
              <tr>
                <td style="padding:0">
                  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tbody>
                      <tr>
                        <td style="border-bottom:2px solid ${C.line};width:${side}px">&nbsp;</td>
                        <td style="border-bottom:2px solid ${C.brand};width:120px">&nbsp;</td>
                        <td style="border-bottom:2px solid ${C.line};width:${side}px">&nbsp;</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>`;
}

function blockHtml(block: EmailBlock, siteUrl: string): string {
  switch (block.kind) {
    case 'heading':
      return `<h1 style="margin:0 0 14px;font-family:${EMAIL_FONT};font-size:21px;line-height:1.3;font-weight:700;color:${C.inkStrong}">${escapeHtml(block.text)}</h1>`;

    case 'paragraph':
      return `<p style="margin:0 0 16px;font-family:${EMAIL_FONT};font-size:14.5px;line-height:1.65;color:${C.body}">${escapeHtml(block.text)}</p>`;

    case 'button': {
      const href = absoluteUrl(block.url, siteUrl);
      if (!href) return '';
      // Tabla de una celda con `bgcolor`: Outlook ignora el `background-color`
      // de un `<a>`, pero sí pinta el `bgcolor` de una celda.
      return `
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:4px 0 20px">
                        <tbody>
                          <tr>
                            <td align="center" bgcolor="${C.brandStrong}" style="border-radius:10px">
                              <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${EMAIL_FONT};font-size:14.5px;font-weight:700;line-height:1;color:${C.white};text-decoration:none;border-radius:10px">${escapeHtml(block.label)}</a>
                            </td>
                          </tr>
                        </tbody>
                      </table>`;
    }

    case 'linkFallback': {
      const href = absoluteUrl(block.url, siteUrl);
      if (!href) return '';
      // `word-break` porque un token JWT no cabe en 580px y, sin romperlo,
      // desborda la tarjeta en el móvil.
      return `<p style="margin:0 0 16px;font-family:${EMAIL_FONT};font-size:12.5px;line-height:1.6;color:${C.muted}">Si el botón no funciona, copia y pega este enlace en tu navegador:<br /><span style="color:${C.brandStrong};word-break:break-all">${escapeHtml(href)}</span></p>`;
    }

    case 'finePrint':
      return `<p style="margin:0 0 12px;font-family:${EMAIL_FONT};font-size:12.5px;line-height:1.6;color:${C.muted}">${escapeHtml(block.text)}</p>`;

    case 'divider':
      return `<div style="border-top:1px solid ${C.line};margin:22px 0"></div>`;
  }
}

function footerHtml(): string {
  const brand = resolveMailBranding();
  const year = new Date().getFullYear();
  const mailto = `mailto:${brand.supportEmail}`;

  return `
        <table align="center" border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:${EMAIL_WIDTH}px;margin:0 auto">
          <tbody>
            <tr>
              <td align="center" style="padding:4px 24px 32px;font-family:${EMAIL_FONT};font-size:12.5px;line-height:1.7;color:${C.muted}">
                <p style="margin:0 0 6px">
                  ¿Dudas? Escríbenos a
                  <a href="${escapeHtml(mailto)}" style="color:${C.brandStrong};text-decoration:underline">${escapeHtml(brand.supportEmail)}</a>
                </p>
                <p style="margin:0 0 6px">
                  <a href="${escapeHtml(brand.siteUrl)}" style="color:${C.muted};text-decoration:underline">${escapeHtml(brand.siteUrl.replace(/^https?:\/\//, ''))}</a>
                </p>
                <p style="margin:0;color:${C.muted}">
                  © ${year} ${escapeHtml(brand.name)}<br />${escapeHtml(brand.addressLine)}
                </p>
              </td>
            </tr>
          </tbody>
        </table>`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Versión en texto plano: misma información, sin una sola etiqueta. */
function renderText(content: EmailContent, siteUrl: string): string {
  const brand = resolveMailBranding();
  const lines: string[] = [];

  for (const block of content.blocks) {
    switch (block.kind) {
      case 'heading':
        lines.push(block.text.toUpperCase(), '');
        break;
      case 'paragraph':
      case 'finePrint':
        lines.push(block.text, '');
        break;
      case 'button': {
        const href = absoluteUrl(block.url, siteUrl);
        if (href) lines.push(`${block.label}: ${href}`, '');
        break;
      }
      case 'linkFallback':
        // En texto plano el enlace ya salió con el botón: repetirlo sobra.
        break;
      case 'divider':
        lines.push('—'.repeat(32), '');
        break;
    }
  }

  lines.push(
    `${brand.name} · ${brand.siteUrl}`,
    `¿Dudas? ${brand.supportEmail}`,
    brand.addressLine,
  );

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Compone el correo completo a partir de sus bloques. Devuelve el asunto tal
 * cual, el HTML y la alternativa en texto plano.
 */
export function renderEmail(content: EmailContent): RenderedEmail {
  const { siteUrl } = resolveMailBranding();
  const body = content.blocks
    .map((block) => blockHtml(block, siteUrl))
    .filter(Boolean)
    .join('\n                      ');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="es" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${C.surface};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
    ${preheaderHtml(content.preheader)}
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:${C.surface}">
      <tbody>
        <tr>
          <td align="center" style="padding:0">
            <table align="center" border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:${EMAIL_WIDTH}px;margin:28px auto 18px;background-color:${C.white};border:1px solid ${C.line};border-radius:14px">
              <tbody>${headerHtml()}${accentRuleHtml()}
                <tr>
                  <td style="padding:26px 30px 8px">
                    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tbody>
                        <tr>
                          <td style="padding:0">
                      ${body}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
${footerHtml()}
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

  return {
    subject: content.subject,
    html,
    text: renderText(content, siteUrl),
  };
}
