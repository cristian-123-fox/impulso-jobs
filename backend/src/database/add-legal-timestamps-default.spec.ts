import { QueryRunner, TableColumn } from 'typeorm';
import { AddLegalTimestampsDefault1720000037000 } from './migrations/1720000037000-AddLegalTimestampsDefault';

/**
 * Las marcas de tiempo del módulo legal necesitan `DEFAULT CURRENT_TIMESTAMP`.
 *
 * Sin ese default TypeORM manda `NULL` en el INSERT y Postgres responde «el
 * valor nulo en la columna created_at viola la restricción de no nulo». Pasó:
 * la migración que creó las tablas omitió el `default` que sí llevan las de
 * `users`, y ningún registro de consentimiento se pudo guardar hasta que esta
 * migración lo arregló.
 *
 * Las pruebas de use-case no lo cazan porque todas usan dobles de repositorio:
 * el default vive en la base, no en el código.
 */
describe('AddLegalTimestampsDefault', () => {
  let changeColumn: jest.Mock;
  let queryRunner: QueryRunner;

  beforeEach(() => {
    changeColumn = jest.fn().mockResolvedValue(undefined);
    queryRunner = { changeColumn } as unknown as QueryRunner;
  });

  it('pone CURRENT_TIMESTAMP en created_at y updated_at de las dos tablas', async () => {
    await new AddLegalTimestampsDefault1720000037000().up(queryRunner);

    const calls = changeColumn.mock.calls as [string, string, TableColumn][];

    expect(calls).toHaveLength(4);
    for (const [table, column, definition] of calls) {
      expect(['legal_consents', 'legal_documents']).toContain(table);
      expect(['created_at', 'updated_at']).toContain(column);
      expect(definition.default).toBe('CURRENT_TIMESTAMP');
      expect(definition.isNullable).toBe(false);
    }
  });

  it('no deshace nada en down: quitar el default reintroduce el fallo', async () => {
    await expect(
      new AddLegalTimestampsDefault1720000037000().down(queryRunner),
    ).resolves.toBeUndefined();

    expect(changeColumn).not.toHaveBeenCalled();
  });
});
