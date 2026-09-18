import { MigrationInterface, QueryRunner } from 'typeorm';
import { deleteSeedRows, upsertSeedRows } from './helpers/seed-data.helper';

const COMPONENT = 'account';
const ACTION = 'profile_manage';
const CODE = `${COMPONENT}.${ACTION}`;
const DESCRIPTION = 'Administrar perfil · Cuenta';

/** Los tres roles base gestionan su propia cuenta. */
const ROLE_CODES = ['ADMIN', 'EMPLOYER', 'CANDIDATE'] as const;

/**
 * Permiso de los endpoints `/account/{profile,password,photo}`: el titular ve y
 * rectifica su identidad y cambia su contraseña.
 *
 * Va en migración y no sólo en `seed-rbac.ts` porque un permiso nuevo que
 * dependa de que alguien recuerde correr el seed se traduce en 403 silenciosos
 * en el entorno que se lo saltó. `seed-rbac.ts` lo lleva además en su `MATRIX`,
 * que es la documentación del mapa rol→permiso y lo que ve una instalación
 * nueva; ambos son idempotentes, así que convivir no duplica nada.
 *
 * ⚠️ Tras aplicarla sobre un servidor en marcha hay que **reiniciar el
 * proceso**: `PermissionsService` cachea el mapa rol→permisos en memoria.
 */
export class AddAccountProfilePermission1720000029000 implements MigrationInterface {
  name = 'AddAccountProfilePermission1720000029000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // El componente ya existe (account.delete / account.data_export); se
    // asegura sin pisarlo por si el back-office le cambió la etiqueta.
    await upsertSeedRows(queryRunner, {
      table: 'components',
      matchBy: ['code'],
      rows: [{ code: COMPONENT, name: 'Cuenta' }],
      updateColumns: [],
    });
    await upsertSeedRows(queryRunner, {
      table: 'actions',
      matchBy: ['code'],
      rows: [{ code: ACTION, name: 'Administrar perfil' }],
      updateColumns: [],
    });

    const componentId = await this.idOf(queryRunner, 'components', COMPONENT);
    const actionId = await this.idOf(queryRunner, 'actions', ACTION);
    if (!componentId || !actionId) {
      throw new Error(
        `${this.name}: falta el componente o la acción tras sembrarlos.`,
      );
    }

    await upsertSeedRows(queryRunner, {
      table: 'permissions',
      matchBy: ['code'],
      rows: [
        {
          code: CODE,
          component_id: componentId,
          action_id: actionId,
          description: DESCRIPTION,
        },
      ],
      updateColumns: [],
    });

    const permissionId = await this.idOf(queryRunner, 'permissions', CODE);
    if (!permissionId) {
      throw new Error(`${this.name}: falta el permiso ${CODE} tras sembrarlo.`);
    }

    for (const roleCode of ROLE_CODES) {
      const roleId = await this.idOf(queryRunner, 'roles', roleCode);
      // Una instalación sin roles base todavía no ha corrido `seed:rbac`; la
      // concesión la hará él con su MATRIX, así que aquí no hay nada que hacer.
      if (!roleId) continue;
      await upsertSeedRows(queryRunner, {
        table: 'role_permissions',
        matchBy: ['role_id', 'permission_id'],
        rows: [{ role_id: roleId, permission_id: permissionId }],
        updateColumns: [],
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const permissionId = await this.idOf(queryRunner, 'permissions', CODE);
    if (permissionId) {
      // Las concesiones primero: `role_permissions` referencia al permiso.
      await deleteSeedRows(queryRunner, {
        table: 'role_permissions',
        column: 'permission_id',
        values: [permissionId],
      });
    }
    await deleteSeedRows(queryRunner, {
      table: 'permissions',
      column: 'code',
      values: [CODE],
    });
    await deleteSeedRows(queryRunner, {
      table: 'actions',
      column: 'code',
      values: [ACTION],
    });
    // `components.account` se queda: lo comparten account.delete y
    // account.data_export, que esta migración no creó.
  }

  /**
   * Id de una fila por su `code`. SQL literal y no un repositorio: una
   * migración describe el esquema del día que se escribió, así que no puede
   * depender de una clase de entidad que cambie después.
   */
  private async idOf(
    queryRunner: QueryRunner,
    table: string,
    code: string,
  ): Promise<string | null> {
    const escape = (identifier: string): string =>
      queryRunner.connection.driver.escape(identifier);
    const parameter = queryRunner.connection.driver.createParameter('code', 0);
    const rows = (await queryRunner.query(
      `SELECT ${escape('id')} FROM ${escape(table)} WHERE ${escape('code')} = ${parameter} LIMIT 1`,
      [code],
    )) as { id: string }[];
    return rows[0]?.id ?? null;
  }
}
