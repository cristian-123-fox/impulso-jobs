import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PERMISSION_CATALOG } from '@/modules/iam/permissions/catalogs/permission-catalog';

/**
 * Un permiso vive en cuatro sitios y **ninguno los ata a los demás**.
 *
 * 1. El guard: `@RequirePermissions('legal.consents.read')`.
 * 2. El catálogo: `'legal.consents.read': { … }`, que es lo que ve el admin en
 *    `/admin/roles`.
 * 3. `seed-rbac.ts`: `PERMISSION_CODES` y la `MATRIX` que reparte por rol.
 * 4. La migración que lo siembra en producción.
 *
 * Si uno de los cuatro se equivoca, **todo compila, los tests unitarios pasan y
 * la aplicación arranca**. Lo único que falla es el endpoint, con un 403 que no
 * dice nada útil. Ya pasó:
 *
 *     la migración sembraba  legal.consents_read
 *     el guard pedía         legal.consents.read
 *
 * El permiso existía en la base, el grupo «Cumplimiento legal» aparecía en
 * `/admin/roles`… y el endpoint devolvía 403 igual, porque el guard compara
 * cadenas exactas, sin aproximaciones.
 *
 * Estos tests atan los cuatro puntos. Son baratos y miran lo que nadie mira.
 */
describe('códigos de permiso', () => {
  const SRC = join(__dirname, '..');

  function walk(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, found);
      else if (entry.endsWith('.ts')) found.push(full);
    }
    return found;
  }

  const files = walk(join(SRC, 'modules'));
  const catalogCodes = new Set(Object.keys(PERMISSION_CATALOG));

  /** Códigos que los guards exigen, leídos de los decorators. */
  const requiredInGuards = (): string[] => {
    const found: string[] = [];
    for (const file of files.filter((f) => f.endsWith('.controller.ts'))) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/@RequirePermissions\(([^)]*)\)/g)) {
        for (const raw of m[1].split(',')) {
          const code = raw.trim().replace(/^['"`]|['"`]$/g, '');
          if (code) found.push(code);
        }
      }
    }
    return found;
  };

  it('todo código que exige un guard está en el catálogo', () => {
    // Si no está en el catálogo, `/admin/roles` lo muestra sin etiqueta bajo
    // «Sin clasificar» y nadie puede concederlo con nombre propio.
    const missing = [...new Set(requiredInGuards())].filter(
      (code) => !catalogCodes.has(code),
    );

    expect(missing).toEqual([]);
  });

  it('todo código del catálogo está en PERMISSION_CODES del seed', () => {
    const seed = readFileSync(join(SRC, 'database', 'seed-rbac.ts'), 'utf8');
    const list = seed.match(/const PERMISSION_CODES[\s\S]*?\];/);
    expect(list).toBeTruthy();

    const inSeed = new Set(
      (list![0].match(/'([a-z_]+\.[a-z_.]+)'/g) ?? []).map((m) =>
        m.replace(/'/g, ''),
      ),
    );

    const missing = [...catalogCodes].filter((code) => !inSeed.has(code));
    expect(missing).toEqual([]);
  });

  it('ninguna migración siembra un código que no esté en el catálogo', () => {
    // Aquí es donde nació el bug: la migración compila igual que las demás.
    const dir = join(SRC, 'database', 'migrations');
    const migrations = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.includes('helper'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');

    // Los códigos que una migración declara como literales para `permissions`.
    const seeded = new Set(
      [...migrations.matchAll(/code:\s*'([a-z_]+\.[a-z_.]+)'/g)].map(
        (m) => m[1],
      ),
    );

    const unknown = [...seeded].filter((code) => !catalogCodes.has(code));
    expect(unknown).toEqual([]);
  });

  it('el código de la migración de permisos legales coincide con el del guard', () => {
    // La comprobación concreta del bug, por si el test de arriba se queda corto
    // con una migración que componentice el código en vez de escribirlo literal.
    const migration = readFileSync(
      join(
        SRC,
        'database',
        'migrations',
        '1720000036000-AddLegalConsentsReadPermission.ts',
      ),
      'utf8',
    );

    const component = migration.match(/const COMPONENT = '([a-z_]+)'/)?.[1];
    const action = migration.match(/const ACTION = '([a-z_.]+)'/)?.[1];
    expect(component).toBeDefined();
    expect(action).toBeDefined();

    const built = `${component}.${action}`;
    expect(built).toBe('legal.consents.read');
    expect(catalogCodes.has(built)).toBe(true);
  });

  it('todo código del catálogo tiene componente y acción con punto', () => {
    // `splitCode` de seed-rbac parte por el primer punto: sin al menos uno, el
    // seed no sabe qué componente crear.
    const malformed = [...catalogCodes].filter(
      (code) => !/^[a-z_]+\.[a-z_.]+$/.test(code),
    );

    expect(malformed).toEqual([]);
  });
});
