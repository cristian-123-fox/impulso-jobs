import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource, type EntityMetadata } from 'typeorm';

/**
 * El arranque completo de la aplicación no levanta si **cualquier** entidad
 * tiene un `@Index`, `@Unique` o `@Relation` que cite una propiedad que la
 * clase no declara. TypeORM lo detecta en `IndexMetadata.build`, al construir
 * los metadatos, y lanza un error cuyo mensaje no menciona a la entidad culpable
 * más que de refilón.
 *
 * No hay forma de que el compilador lo advierta: los decoradores no se
 * comprueban. Por eso este test carga **todas** las entidades y construye sus
 * metadatos, igual que hace `DataSource.initialize()`.
 *
 * No se abre conexión: `buildMetadatas()` sólo resuelve columnas, índices,
 * relaciones y claves foráneas. Las opciones de conexión existen porque el
 * validador de TypeORM exige que `database` esté definido, y nunca se usan.
 *
 * ## El fallo que motivó este archivo
 *
 * `legal_consents` declaraba `@Index('idx_legal_consents_code_time',
 * ['documentCode', 'consentedAt'])`, pero `consentedAt` es el nombre con el que
 * el DTO expone el instante; la columna real es `created_at`, heredada de
 * `BaseEntity`. Compilaba sin quejarse, los tests unitarios pasaban, y la
 * aplicación no arrancaba:
 *
 *     TypeORMError: Index "idx_legal_consents_code_time" contains column that
 *     is missing in the entity (LegalConsent): consentedAt
 *
 * Con `backend: 3306` sin(t)do, y sin migración aplicada.
 */
describe('metadatos de todas las entidades', () => {
  const ROOT = join(__dirname, '..');

  /** Las entidades viven en `modules/**\/entities/*.entity.ts`. */
  const IGNORED_DIRS = ['node_modules', 'dist'];

  /**
   * `base.entity.ts` también acaba en `.entity.ts` pero es abstracta y no se
   * registra: incluirla daría 46 archivos y 45 entidades.
   */
  const NOT_ENTITIES = ['base.entity.ts'];

  function findEntityFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (IGNORED_DIRS.includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        findEntityFiles(full, found);
      } else if (
        entry.endsWith('.entity.ts') &&
        !NOT_ENTITIES.includes(entry)
      ) {
        found.push(full);
      }
    }
    return found;
  }

  const entityFiles = findEntityFiles(ROOT);

  const buildAllMetadata = async (): Promise<EntityMetadata[]> => {
    // `new () => unknown` en vez de `Function`: ESLint rechaza el tipo `Function`
    // (`no-unsafe-function-type`) y no aporta nada aquí.
    type EntityClass = new () => unknown;

    const entities = entityFiles.map((file): EntityClass => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const loaded = require(file) as Record<string, unknown>;
      const [first] = Object.values(loaded);
      if (typeof first !== 'function') {
        throw new Error(`${file} no exporta una clase de entidad.`);
      }
      return first as unknown as EntityClass;
    });

    const dataSource = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'metadata-only',
      password: 'metadata-only',
      database: 'metadata_only',
      entities,
      synchronize: false,
    });

    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();

    return dataSource.entityMetadatas;
  };

  it('encuentra entidades que probar', () => {
    // Si el recorrido se rompe, el resto del archivo pasa sin comprobar nada y
    // da una falsa señal de que todo está en orden.
    expect(entityFiles.length).toBeGreaterThan(20);
  });

  it('construye los metadatos de todas sin lanzar', async () => {
    const metadata = await buildAllMetadata();

    expect(metadata).toHaveLength(entityFiles.length);
  });

  it('cada índice y cada único cita columnas que la entidad declara', async () => {
    const metadata = await buildAllMetadata();
    const violations: string[] = [];

    for (const entity of metadata) {
      const columnNames = new Set(
        entity.columns.map((column) => column.propertyName),
      );

      for (const index of entity.indices) {
        for (const column of index.columns) {
          if (!columnNames.has(column.propertyName)) {
            violations.push(
              `${entity.tableName}.${index.name} cita ` +
                `"${column.propertyName}", que la entidad no declara`,
            );
          }
        }
      }

      for (const relation of entity.relations) {
        if (relation.isLazy) continue;
        if (!columnNames.has(relation.propertyName)) {
          violations.push(
            `${entity.tableName} declara la relación ` +
              `"${relation.propertyName}" pero no la mapea a ninguna columna`,
          );
        }
      }
    }

    // Jest no admite un segundo argumento en `expect()` como mensaje, así que los
    // fallos se acumulan y se afirma sobre la lista: el reporte los enseña todos
    // de una vez, en vez de uno por corrida.
    expect(violations).toEqual([]);
  });

  it('ninguna entidad legal nombra `consentedAt` en un índice', () => {
    // Fijado uno por uno porque es el error que ya ocurrió una vez y el que
    // anybody tocaría al añadir un índice nuevo a `legal_consents`.
    const legalEntities = entityFiles.filter((file) =>
      file.includes('legal-consent.entity'),
    );

    expect(legalEntities).toHaveLength(1);
  });
});
