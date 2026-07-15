/**
 * Configuración de entorno (desarrollo). En producción se reemplaza vía
 * `fileReplacements` de `angular.json` apuntando a la URL real de la API.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
};
