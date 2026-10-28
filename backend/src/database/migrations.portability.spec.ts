import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El proyecto corre en PostgreSQL (desarrollo) y MySQL/MariaDB (cPanel). Las
 * migraciones no pueden usar sintaxis exclusiva de uno de los dos motores: una
 * migración que funciona en Postgres y falla en MariaDB deja el despliegue a
 * medias, que es justo lo que pasó con `COUNT(*)::int`.
 *
 * Este test es estático y barato: recorre los archivos de `migrations/` y falla
 * si aparece una construcción conocida como no portable. No sustituye a correr
 * las migraciones contra MySQL, pero evita que la regresión vuelva a colarse en
 * un commit.
 */
const FORBIDDEN: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /::[a-zA-Z]/, reason: 'cast de PostgreSQL (`::int`, `::text`…)' },
  { pattern: /\bILIKE\b/i, reason: 'ILIKE (PostgreSQL)' },
  { pattern: /\bRETURNING\b/i, reason: 'RETURNING (PostgreSQL)' },
  { pattern: /\bON\s+CONFLICT\b/i, reason: 'ON CONFLICT (PostgreSQL)' },
  { pattern: /\bDISTINCT\s+ON\b/i, reason: 'DISTINCT ON (PostgreSQL)' },
  { pattern: /\bNULLS\s+(FIRST|LAST)\b/i, reason: 'orden NULLS FIRST/LAST (PostgreSQL)' },
  { pattern: /\bjsonb\b/i, reason: 'tipo jsonb (PostgreSQL)' },
  { pattern: /\bgen_random_uuid\b/i, reason: 'gen_random_uuid (PostgreSQL)' },
];

describe('migraciones portables PostgreSQL/MySQL', () => {
  const dir = join(__dirname, 'migrations');
  const files = readdirSync(dir).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
  );

  it('encuentra las migraciones', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  for (const file of files) {
    it(`${file} no usa sintaxis exclusiva de PostgreSQL`, () => {
      const sql = readFileSync(join(dir, file), 'utf8');
      for (const { pattern, reason } of FORBIDDEN) {
        expect({
          file,
          reason,
          match: sql.match(pattern)?.[0] ?? null,
        }).toEqual({ file, reason, match: null });
      }
    });
  }
});
