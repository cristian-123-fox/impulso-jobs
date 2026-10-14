import { DataSource, type EntityMetadata } from 'typeorm';

/**
 * `IndexMetadata` no está exportado desde `typeorm` en esta versión, así que se
 * describe con lo mínimo que hace falta para leer sus columnas.
 */
interface IndexLike {
  readonly columns: readonly { readonly propertyName: string }[];
}
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';

/**
 * El arranque de la aplicación construye los metadatos de TypeORM, y ahí es
 * donde un `@Index` que cita una propiedad inexistente revienta con
 * `IndexMetadata.build`: la app no levanta, sin aviso útil y sin que el fallo
 * tenga nada que ver con la entidad que lo causó.
 *
 * Pasó de verdad. El índice de `legal_consents` citaba `consentedAt` — el nombre
 * con el que el DTO expone el instante — mientras que la columna real es el
 * `created_at` que hereda `BaseEntity`. Compilaba sin quejarse: los decoradores
 * no se comprueban en tiempo de compilación. Fallaba sólo al conectar, que es
 * justo cuando ya no se puede dar marcha atrás.
 *
 * Estos tests no comprueban tipos: comprueban que los metadatos **se construyen**
 * y que cada índice apunta a columnas que existen.
 */
describe('metadatos de las entidades legales', () => {
  /**
   * `mysql` porque es el driver que sí está instalado. Las opciones de conexión
   * son inventadas a propósito: `buildMetadatas()` no abre conexión, pero el
   * validador de TypeORM (`EntityMetadataValidator`) sí exige que `database`
   * exista antes de dejar construir. Nunca se resuelve ni se intenta.
   */
  const metadataOf = async (
    entities: (new () => unknown)[],
  ): Promise<EntityMetadata[]> => {
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

    // `buildMetadatas()` no devuelve nada: deja el resultado en el DataSource.
    return dataSource.entityMetadatas;
  };

  const columnsOf = (index: IndexLike): string[] =>
    index.columns.map((column) => column.propertyName);

  it('construye los metadatos de LegalDocument', async () => {
    const metadata = await metadataOf([LegalDocument]);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].tableName).toBe('legal_documents');
  });

  it('construye los metadatos de LegalConsent', async () => {
    const metadata = await metadataOf([LegalConsent]);

    expect(metadata).toHaveLength(1);
    expect(metadata[0].tableName).toBe('legal_consents');
  });

  it('construye los metadatos de las dos juntas', async () => {
    await expect(
      metadataOf([LegalDocument, LegalConsent]),
    ).resolves.toHaveLength(2);
  });

  it('cada índice de LegalConsent cita columnas que existen', async () => {
    const [metadata] = await metadataOf([LegalConsent]);
    const columnNames = new Set(metadata.columns.map((c) => c.propertyName));

    // Lo que falló en producción, explícito: `consentedAt` es el nombre del DTO,
    // no una columna de la entidad.
    expect(columnNames).toContain('createdAt');
    expect(columnNames).not.toContain('consentedAt');

    expect(metadata.indices.length).toBeGreaterThan(0);
    for (const index of metadata.indices) {
      for (const column of columnsOf(index)) {
        expect(columnNames.has(column)).toBe(true);
      }
    }
  });

  it('el índice de historial ordena por documento e instante', async () => {
    // `('document_code', 'created_at')` es lo que hace posible responder
    // «¿cuál fue la última decisión sobre este documento?» en una consulta.
    const [metadata] = await metadataOf([LegalConsent]);
    const byTime = metadata.indices.find(
      (index) => index.name === 'idx_legal_consents_code_time',
    );

    expect(byTime).toBeDefined();
    expect(columnsOf(byTime!)).toEqual(['documentCode', 'createdAt']);
  });

  it('el único de LegalDocument es código + versión', async () => {
    const [metadata] = await metadataOf([LegalDocument]);
    const uniques = metadata.indices.filter((index) => index.isUnique);

    expect(uniques).toHaveLength(1);
    expect(columnsOf(uniques[0])).toEqual(['code', 'version']);
  });
});
