import type { QueryRunner } from 'typeorm';
import {
  deleteSeedRows,
  upsertSeedRows,
} from '@/database/migrations/helpers/seed-data.helper';

/**
 * El helper no toca una BD real: lo que se comprueba aquí es que emite el SQL
 * correcto para **los dos** drivers, porque es justo donde se cuela el fallo que
 * sólo aparece en producción (MySQL) tras haber probado en PostgreSQL.
 */

interface Executed {
  sql: string;
  params: unknown[];
}

function fakeRunner(
  dialect: 'postgres' | 'mysql',
  selectResults: Array<Array<{ id: string }>>,
): { runner: QueryRunner; executed: Executed[] } {
  const executed: Executed[] = [];
  let selectIndex = 0;

  const driver = {
    escape: (identifier: string): string =>
      dialect === 'postgres' ? `"${identifier}"` : `\`${identifier}\``,
    createParameter: (_name: string, index: number): string =>
      dialect === 'postgres' ? `$${index + 1}` : '?',
  };

  const runner = {
    connection: { driver },
    query: (sql: string, params: unknown[] = []): Promise<unknown> => {
      executed.push({ sql, params });
      if (sql.startsWith('SELECT')) {
        return Promise.resolve(selectResults[selectIndex++] ?? []);
      }
      return Promise.resolve([]);
    },
  } as unknown as QueryRunner;

  return { runner, executed };
}

describe('seed-data.helper', () => {
  describe('upsertSeedRows', () => {
    it('inserta con id UUID y timestamps cuando la fila no existe', async () => {
      const { runner, executed } = fakeRunner('postgres', [[]]);

      const result = await upsertSeedRows(runner, {
        table: 'application_status',
        matchBy: ['code'],
        rows: [{ code: 'HIRED', name: 'Contratado', sort_order: 8 }],
      });

      expect(result).toEqual({ created: 1, updated: 0 });

      const insert = executed[1];
      expect(insert.sql).toContain('INSERT INTO "application_status"');
      expect(insert.sql).toContain('"id"');
      expect(insert.sql).toContain('"created_at"');
      expect(insert.sql).toContain('"updated_at"');
      // Placeholders correlativos: $1..$6, no repetidos.
      expect(insert.sql).toContain('VALUES ($1, $2, $3, $4, $5, $6)');
      expect(insert.params).toHaveLength(6);
      expect(insert.params[0]).toBe('HIRED');
      // El id se genera en Node (UUID v4), como BaseEntity.
      expect(insert.params[3]).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('actualiza por id, sin tocar las columnas de búsqueda', async () => {
      const { runner, executed } = fakeRunner('postgres', [[{ id: 'row-1' }]]);

      const result = await upsertSeedRows(runner, {
        table: 'application_status',
        matchBy: ['code'],
        rows: [{ code: 'HIRED', name: 'Contratado' }],
      });

      expect(result).toEqual({ created: 0, updated: 1 });

      const update = executed[1];
      expect(update.sql).toBe(
        'UPDATE "application_status" SET "name" = $1, "updated_at" = $2 WHERE "id" = $3',
      );
      expect(update.params[0]).toBe('Contratado');
      expect(update.params[2]).toBe('row-1');
    });

    it('con updateColumns vacío deja intacta la fila existente', async () => {
      const { runner, executed } = fakeRunner('postgres', [[{ id: 'row-1' }]]);

      const result = await upsertSeedRows(runner, {
        table: 'plan_features',
        matchBy: ['code'],
        rows: [{ code: 'TALENT_DB_ACCESS', name: 'Base de talento' }],
        updateColumns: [],
      });

      expect(result).toEqual({ created: 0, updated: 0 });
      expect(executed).toHaveLength(1); // sólo el SELECT
    });

    it('usa comillas invertidas y ? en MySQL', async () => {
      const { runner, executed } = fakeRunner('mysql', [[]]);

      await upsertSeedRows(runner, {
        table: 'application_status',
        matchBy: ['code'],
        rows: [{ code: 'HIRED', name: 'Contratado' }],
        withId: false,
        withTimestamps: false,
      });

      expect(executed[0].sql).toBe(
        'SELECT `id` FROM `application_status` WHERE `code` = ? LIMIT 1',
      );
      expect(executed[1].sql).toBe(
        'INSERT INTO `application_status` (`code`, `name`) VALUES (?, ?)',
      );
      // Ni una comilla doble: en MySQL sería un literal de cadena, no un identificador.
      expect(executed.every((e) => !e.sql.includes('"'))).toBe(true);
    });

    it('rechaza matchBy vacío', async () => {
      const { runner } = fakeRunner('postgres', [[]]);

      await expect(
        upsertSeedRows(runner, { table: 't', matchBy: [], rows: [{ a: 1 }] }),
      ).rejects.toThrow('matchBy no puede estar vacío');
    });

    it('rechaza una fila que no trae la columna de búsqueda', async () => {
      const { runner } = fakeRunner('postgres', [[]]);

      await expect(
        upsertSeedRows(runner, {
          table: 't',
          matchBy: ['code'],
          rows: [{ name: 'sin code' }],
        }),
      ).rejects.toThrow('no trae la columna de búsqueda "code"');
    });
  });

  describe('deleteSeedRows', () => {
    it('borra sólo los valores indicados', async () => {
      const { runner, executed } = fakeRunner('postgres', []);

      await deleteSeedRows(runner, {
        table: 'application_status',
        column: 'code',
        values: ['HIRED', 'ON_HOLD'],
      });

      expect(executed[0].sql).toBe(
        'DELETE FROM "application_status" WHERE "code" IN ($1, $2)',
      );
      expect(executed[0].params).toEqual(['HIRED', 'ON_HOLD']);
    });

    it('no ejecuta nada sin valores (nunca un DELETE sin WHERE)', async () => {
      const { runner, executed } = fakeRunner('postgres', []);

      await deleteSeedRows(runner, { table: 't', column: 'code', values: [] });

      expect(executed).toHaveLength(0);
    });
  });
});
