import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Un guard con dependencias no se resuelve solo.
 *
 * `PermissionsGuard` necesita `PermissionsService` inyectado. Si un módulo
 * registra un controller que lo usa sin importar `PermissionsModule`, **todo
 * compila**: el typecheck no mira el grafo de inyección, los tests unitarios
 * instancian los use-cases a mano, y `nest build` tampoco lo comprueba. La
 * aplicación revienta al arrancar, con un error que habla de dependencias y no
 * menciona el controller que las usó.
 *
 * Ya pasó una vez: `AdminLegalController` usaba `PermissionsGuard` y
 * `LegalModule` no importaba `PermissionsModule`. La forma correcta de sujetar
 * esto es no confiar en que alguien recuerde el import.
 */
describe('grafo de inyección de los guards', () => {
  const SRC = join(__dirname, '..', 'modules');

  function walk(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, found);
      else if (entry.endsWith('.ts')) found.push(full);
    }
    return found;
  }

  const files = walk(SRC);

  const modules = files.filter((f) => f.endsWith('.module.ts'));
  const controllers = files.filter((f) => f.endsWith('.controller.ts'));
  const read = (f: string): string => readFileSync(f, 'utf8');

  /**
   * Clase que exporta un controller, por convención del repo:
   * `admin-legal.controller.ts` → `AdminLegalController`.
   */
  const classNameOf = (controllerFile: string): string => {
    const base = controllerFile
      .split(/[\\/]/)
      .pop()!
      .replace('.controller.ts', '');
    return (
      base
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Controller'
    );
  };

  /**
   * Cuerpo del valor de una propiedad del decorador `@Module`, con conteo real
   * de corchetes.
   *
   * Un regex no vale: `imports: [TypeOrmModule.forFeature([A, B]), AuthModule]`
   * contiene corchetes anidados, y cualquier expresión regular se cortaría en el
   * primero y leería una lista truncada.
   */
  const moduleArray = (moduleFile: string, property: string): string => {
    // Los comentarios se borran antes: mencionar un módulo en un comentario no
    // lo importa, y ya ha pasado que un test pasara por eso.
    const source = read(moduleFile)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

    const start = source.search(new RegExp(`${property}:\\s*\\[`));
    if (start < 0) return '';

    const open = source.indexOf('[', start);
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === '[') depth += 1;
      else if (source[i] === ']') {
        depth -= 1;
        if (depth === 0) return source.slice(open + 1, i);
      }
    }
    return '';
  };

  /** Nombres de los módulos del array `imports`. */
  const importsOf = (moduleFile: string): string[] =>
    [
      ...moduleArray(moduleFile, 'imports').matchAll(
        /([A-Za-z_][A-Za-z0-9_]*)Module/g,
      ),
    ].map((m) => m[1] + 'Module');

  /** ¿Este módulo registra el controller dado en su array `controllers`? */
  const registers = (moduleFile: string, controllerFile: string): boolean =>
    moduleArray(moduleFile, 'controllers').includes(
      classNameOf(controllerFile),
    );

  /**
   * Controllers que usan un guard, con los módulos que los registran.
   *
   * Se resuelve con un filtro y no con un bucle por test porque la comprobación
   * es la misma en los tres casos; lo único que cambia es qué módulo falta.
   *
   * `except` quita los módulos que **definen** el guard: `permissions.module.ts`
   * provee `PermissionsGuard` y `PermissionsService`, y `auth.module.ts` provee
   * las dependencias de `JwtAuthGuard`. Ninguno se importa a sí mismo, y
   * exigirlo daría un falso positivo que acabaría ignorándose.
   */
  const controllersUsing = (
    guard: string,
    except: readonly string[] = [],
  ): { controller: string; owners: string[] }[] =>
    controllers
      .filter((c) => read(c).includes(guard))
      .map((controller) => ({
        controller: controller.split(/[\\/]/).pop()!,
        owners: modules.filter((m) => registers(m, controller)),
      }))
      .filter(
        ({ owners }) =>
          !owners.length ||
          !owners.every((m) => except.includes(m.split(/[\\/]/).pop()!)),
      );

  it('encuentra controllers y módulos que probar', () => {
    expect(controllers.length).toBeGreaterThan(20);
    expect(modules.length).toBeGreaterThan(10);
  });

  it('todo controller con PermissionsGuard está en un módulo que importa PermissionsModule', () => {
    const offenders = controllersUsing('PermissionsGuard', [
      'permissions.module.ts',
    ]).filter(
      ({ owners }) =>
        !owners.some((m) => importsOf(m).includes('PermissionsModule')),
    );

    expect(offenders.map((o) => o.controller).join('\n')).toBe('');
  });

  it('todo controller con RolesGuard está en un módulo que importa PermissionsModule', () => {
    const offenders = controllersUsing('RolesGuard', [
      'permissions.module.ts',
    ]).filter(
      ({ owners }) =>
        !owners.some((m) => importsOf(m).includes('PermissionsModule')),
    );

    expect(offenders.map((o) => o.controller).join('\n')).toBe('');
  });

  it('todo controller con JwtAuthGuard está en un módulo que importa AuthModule', () => {
    const offenders = controllersUsing('JwtAuthGuard', [
      'auth.module.ts',
    ]).filter(
      ({ owners }) => !owners.some((m) => importsOf(m).includes('AuthModule')),
    );

    expect(offenders.map((o) => o.controller).join('\n')).toBe('');
  });
});
