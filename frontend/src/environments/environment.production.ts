/**
 * Configuración de entorno para PRODUCCIÓN (cPanel).
 * `angular.json` reemplaza `environment.ts` por este archivo en el build de
 * producción (fileReplacements). Ajusta `apiBaseUrl` al subdominio real de la
 * API antes de compilar, p. ej. https://api.tudominio.com/api/v1
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.impulsojobs.com/api/v1',
  /** Base absoluta del sitio: canonical, og:url y JSON-LD (T16). */
  siteUrl: 'https://impulsojobs.com',
  /**
   * Client ID de Google para el login con Google (mismo valor que
   * `GOOGLE_CLIENT_ID` en el `.env` del backend). Mientras esté vacío, el
   * botón no se ofrece; al rellenarlo, declarar `siteUrl` como origen de
   * JavaScript autorizado en Google Cloud Console.
   */
  googleClientId: '346875649935-iidcr4041osdva1u4ak01k3ifaiqss8u.apps.googleusercontent.com',
};
