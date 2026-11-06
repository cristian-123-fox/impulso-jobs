/**
 * Guardia de build para el despliegue.
 *
 * Este proyecto ya sufrió dos incidentes por publicar un `dist` que conservaba
 * archivos de builds anteriores:
 *
 *   1. `legal/CIF CHRISTIAN-8.pdf` (RFC, CURP y domicilio) seguía público.
 *   2. `legal/politica-privacidad.pdf` y `legal/terminos-condiciones.pdf`
 *      (versiones antiguas) seguían públicos.
 *   3. Un `index.html` viejo en la raíz hacía que `/` respondiera 200 con el
 *      stub de redirección, en vez del 301.
 *
 * El build actual no genera ninguno de esos archivos. Si vuelven a aparecer,
 * el build debe fallar ANTES de subirse al servidor.
 *
 * Uso: `node scripts/check-dist.mjs` (se ejecuta solo al final de `pnpm build`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const frontendDist = join(dist, 'frontend');
const browser = join(frontendDist, 'browser');
const serverEntry = join(frontendDist, 'server', 'server.mjs');

const errors = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

if (!existsSync(browser)) {
  errors.push('No existe dist/frontend/browser. ¿Corriste el build de producción?');
}

if (!existsSync(serverEntry)) {
  errors.push(
    'No existe dist/frontend/server/server.mjs. El despliegue SSR no podría arrancar.',
  );
}

// 1. Ningún PDF debe viajar en el build.
const pdfs = walk(dist).filter((file) => file.toLowerCase().endsWith('.pdf'));
if (pdfs.length > 0) {
  errors.push(
    `Hay ${pdfs.length} PDF(s) en dist, que se publicarían tal cual:\n` +
      pdfs.map((file) => `  - ${file.replace(root, '.')}`).join('\n'),
  );
}

// 2. La raíz no debe tener index.html: `/` se resuelve con 301.
const rootIndex = join(browser, 'index.html');
if (existsSync(rootIndex)) {
  errors.push(
    'Existe dist/frontend/browser/index.html. Ese archivo hacía que `/` respondiera 200 en vez de 301; no debe desplegarse.',
  );
}

// 3. El shell CSR sí debe existir.
if (!existsSync(join(browser, 'index.csr.html'))) {
  errors.push(
    'Falta dist/frontend/browser/index.csr.html. Sin él, /vacantes y las rutas dinámicas no cargan en modo estático.',
  );
}

// 4. El 301 debe estar tanto en el servidor SSR como en el .htaccess estático.
const ssrRedirect = /redirect\(\s*301\s*,\s*["']\/vacantes["']\s*\)/;
if (existsSync(serverEntry)) {
  const serverSource = readFileSync(serverEntry, 'utf8');
  if (!ssrRedirect.test(serverSource)) {
    errors.push(
      'server/server.mjs no contiene el redirect 301 de `/` a `/vacantes`. Revisa src/server.ts.',
    );
  }
}

const htaccess = join(browser, '.htaccess');
if (!existsSync(htaccess)) {
  errors.push(
    'Falta dist/frontend/browser/.htaccess. El despliegue estático perdería el 301 y el fallback a index.csr.html.',
  );
} else {
  const htaccessSource = readFileSync(htaccess, 'utf8');
  if (!/RewriteRule\s+\^\$\s+\/vacantes\s+\[R=301,L\]/.test(htaccessSource)) {
    errors.push(
      '.htaccess no contiene la regla `RewriteRule ^$ /vacantes [R=301,L]`.',
    );
  }
  if (!/DirectoryIndex\s+index\.csr\.html/.test(htaccessSource)) {
    errors.push('.htaccess no apunta el DirectoryIndex a index.csr.html.');
  }
}

if (errors.length > 0) {
  console.error('\n✖ Build NO apto para desplegar:\n');
  for (const error of errors) console.error(`  - ${error}\n`);
  process.exit(1);
}

console.log(
  '✔ Build limpio: sin PDFs, sin index.html raíz, con index.csr.html, .htaccess y 301 en el servidor.',
);
