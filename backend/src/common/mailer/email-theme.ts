/**
 * Marca y colores de los correos transaccionales.
 *
 * **Los colores son los del portal**, copiados de `frontend/tailwind.config.js`:
 * un correo no puede importar el tema de Tailwind (no hay clases ni hoja de
 * estilos: todo va en atributos `style` en línea, que es lo único que sobrevive
 * a Gmail y Outlook). Si cambia la paleta del portal, cambia también aquí — son
 * los dos únicos sitios donde viven estos hexadecimales.
 *
 * ⚠️ **El relleno de un botón usa `brandStrong` (#b3571d), no el naranja base.**
 * El naranja de marca sobre texto blanco da 2.90:1 y no alcanza WCAG AA; el 700
 * da 4.89:1. Es la misma regla que ya documenta el `tailwind.config.js`, y en un
 * correo importa más todavía porque nadie puede "ajustar el brillo" del cliente.
 */
export const EMAIL_COLORS = {
  /** Naranja de marca. Para filetes y acentos, **no** como fondo de texto blanco. */
  brand: '#e47c3f',
  /** Naranja accesible: relleno de botones y enlaces de marca. */
  brandStrong: '#b3571d',
  /** Naranja tenue: fondo de avisos y cajas destacadas. */
  brandSoft: '#fbefe9',
  /** Azul corporativo. */
  ink: '#1f3b73',
  /** Tinta de titulares. */
  inkStrong: '#1a1a2e',
  /** Texto corrido. */
  body: '#35354a',
  /** Texto secundario y letra pequeña. */
  muted: '#6d6d84',
  /** Fondo de la ventana del correo (fuera de la tarjeta). */
  surface: '#f5f7fb',
  /** Bordes y separadores. */
  line: '#eceef3',
  white: '#ffffff',
} as const;

/**
 * Rubik es la tipografía del portal, pero **un correo no carga fuentes web** en
 * la mayoría de clientes: se declara igual por los que sí (Apple Mail), y detrás
 * van las de sistema, que son las que se verán casi siempre.
 */
export const EMAIL_FONT =
  "Rubik,'Helvetica Neue',Helvetica,Arial,'Segoe UI',sans-serif";

/** Ancho de la tarjeta. 580px es el consenso para que quepa en el panel de lectura. */
export const EMAIL_WIDTH = 580;

export interface MailBranding {
  /** Nombre de la marca, tal cual se firma. */
  name: string;
  /** Base absoluta del portal (`APP_WEB_URL`), sin barra final. */
  siteUrl: string;
  /** URL absoluta del isotipo. Vacía = se pinta sólo el wordmark de texto. */
  logoUrl: string;
  /** Alto del isotipo en el encabezado, en px. */
  logoHeight: number;
  /** Ancho proporcional al alto (el archivo original es 518×621). */
  logoWidth: number;
  /** Correo de soporte que se ofrece en el pie. */
  supportEmail: string;
  /** Dirección postal del pie: CAN-SPAM la pide y los filtros la valoran. */
  addressLine: string;
}

const DEFAULT_SITE_URL = 'http://localhost:4200';

/** Ruta del isotipo dentro de `frontend/public/`, servido desde la raíz del portal. */
const LOGO_PATH = '/assets/images/logos/logo_naranja.png';

/** Proporción del archivo original (518×621). */
const LOGO_RATIO = 518 / 621;
const LOGO_HEIGHT = 44;

/**
 * ⚠️ **TODO(negocio): datos de muestra.** El correo de soporte y la dirección
 * salen de la misma ficha ficticia que el pie del portal
 * (`frontend/src/app/shared/catalogs/brand.catalogs.ts`, que lleva el mismo
 * aviso). Cuando el negocio dé los reales hay que cambiarlos **en los dos
 * sitios**: no hay paquete compartido entre `backend/` y `frontend/`, así que
 * esto es una copia consciente y no un descuido.
 */
const SUPPORT_EMAIL = 'soporte@impulsojobs.mx';
const ADDRESS_LINE =
  'Av. Paseo de la Reforma 296, piso 4, Col. Juárez, Cuauhtémoc, 06600, Ciudad de México';

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/**
 * Marca resuelta para un envío. Se lee del entorno **en cada llamada** y no al
 * cargar el módulo: así un test puede cambiar `APP_WEB_URL` sin recargar nada, y
 * el coste es una concatenación de cadenas por correo.
 *
 * `MAIL_LOGO_URL` permite apuntar el logo a un CDN o a otro host sin tocar
 * código — útil si el portal queda detrás de un login o cambia de dominio. Sin
 * ella se compone sobre `APP_WEB_URL`, que es donde el portal ya sirve el
 * archivo.
 */
export function resolveMailBranding(): MailBranding {
  const siteUrl = trimTrailingSlash(
    process.env.APP_WEB_URL?.trim() || DEFAULT_SITE_URL,
  );
  const logoOverride = process.env.MAIL_LOGO_URL?.trim();

  return {
    name: 'Impulso Jobs',
    siteUrl,
    logoUrl: logoOverride || `${siteUrl}${LOGO_PATH}`,
    logoHeight: LOGO_HEIGHT,
    logoWidth: Math.round(LOGO_HEIGHT * LOGO_RATIO),
    supportEmail: SUPPORT_EMAIL,
    addressLine: ADDRESS_LINE,
  };
}
