/**
 * Configuración de entorno para PRODUCCIÓN (cPanel).
 * `angular.json` reemplaza `environment.ts` por este archivo en el build de
 * producción (fileReplacements). Ajusta `apiBaseUrl` al subdominio real de la
 * API antes de compilar, p. ej. https://api.tudominio.com/api/v1
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.tudominio.com/api/v1',
};
