/**
 * Configuración de entorno (desarrollo). En producción se reemplaza vía
 * `fileReplacements` de `angular.json` apuntando a la URL real de la API.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  /** Base absoluta del sitio: canonical, og:url y JSON-LD (T16). */
  siteUrl: 'http://localhost:4200',
  /**
   * Client ID de Google Identity Services, para el botón de login con Google.
   * Es el **mismo** valor que `GOOGLE_CLIENT_ID` en `backend/.env`: aquí se usa
   * para pedir el ID token, allí para verificarlo. Vacío ⇒ el botón no se
   * ofrece. En Google Cloud hay que declarar este origen en "Orígenes de
   * JavaScript autorizados" (http://localhost:4200).
   */
  googleClientId: '346875649935-iidcr4041osdva1u4ak01k3ifaiqss8u.apps.googleusercontent.com',
};
