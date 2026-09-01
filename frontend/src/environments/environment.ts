/**
 * Configuración de entorno (desarrollo). En producción se reemplaza vía
 * `fileReplacements` de `angular.json` apuntando a la URL real de la API.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  /** Base absoluta del sitio: canonical, og:url y JSON-LD (T16). */
  siteUrl: 'http://localhost:4200',
};
