import { MigrationInterface, QueryRunner } from 'typeorm';
import { deleteSeedRows, upsertSeedRows } from './helpers/seed-data.helper';

const COMPONENT = 'legal';
/**
 * `consents.read`, **con punto**, no `consents_read`.
 *
 * El código completo es el que comparan el guard (`@RequirePermissions`) y el
 * catálogo. `seed-rbac.ts` lo parte con `splitCode`, que se queda con todo lo
 * posterior al **primer** punto: por eso hay acciones con punto
 * (`candidates.cv.read`) y otras sin él (`account.profile_manage`). Lo que no
 * puede pasar es que el action y el código no encajen.
 *
 * Pasó una vez: esta migración sembraba `legal.consents_read` mientras el
 * guard pedía `legal.consents.read`. El permiso existía, el grupo aparecía en
 * `/admin/roles`, y el endpoint devolvía 403 sin explicación posible.
 */
const ACTION = 'consents.read';
const CODE = `${COMPONENT}.${ACTION}`;
const DESCRIPTION = 'Cumplimiento legal · Ver consentimientos';

/**
 * Código que sembró una versión equivocada de esta migración. Se limpia en
 * `up()` para que re-aplicarla reparte el estado en vez de dejar el huérfano
 * dando vueltas por el árbol de permisos.
 */
const WRONG_CODE = 'legal.consents_read';

/**
 * Sólo el rol ADMIN. A diferencia de `AddAccountProfilePermission`, que concede a
 * los tres, un permiso de back-office no va en la base por ámbito: que leer el
 * registro de consentimientos de toda la plataforma sea una decisión del
 * administrador y no una consecuencia de tener cuenta.
 */
const ROLE_CODES = ['ADMIN'] as const;

/**
 * Permiso de `GET /admin/legal-consents`.
 *
 * Va en migración y no sólo en `seed-rbac.ts` porque un permiso nuevo que
 * dependa de que alguien recuerde correr el seed se traduce en 403 silenciosos
 * en el entorno que se lo saltó. `seed-rbac.ts` lo lleva además en su `MATRIX`,
 * que es la documentación del mapa rol→permiso y lo que ve una instalación
 * nueva; ambos son idempotentes, así que convivir no duplica nada.
 *
 * ## Por qué el ADMIN sí queda con esto
 *
 * Va por fila en `role_permissions`, no en `PROTECTED_ROLE_PERMISSIONS`. La
 * diferencia importa: el ADMIN **puede** quitárselo a otro rol o a sí mismo (y
 * entonces esa pantalla le dará 403, que es lo correcto si alguien quiere
 * dejar de verla). Lo que no puede es quedarse sin la llave para volver a
 * entrar a `/admin/roles`, y para eso están los tres permisos protegidos, que
 * este no toca.
 *
 * ⚠️ Tras aplicarla sobre un servidor en marcha hay que **reiniciar el proceso**:
 * `PermissionsService` cachea el mapa rol→permisos en memoria.
 */
export class AddLegalConsentsReadPermission1720000036000 implements MigrationInterface {
  name = 'AddLegalConsentsReadPermission1720000036000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La fila equivocada de una versión previa se va primero: dejarla produce un
    // permiso huérfano en el árbol que nadie entiende y que nunca concede nada.
    const wrongId = await this.idOf(queryRunner, 'permissions', WRONG_CODE);
    if (wrongId) {
      await deleteSeedRows(queryRunner, {
        table: 'role_permissions',
        column: 'permission_id',
        values: [wrongId],
      });
      await deleteSeedRows(queryRunner, {
        table: 'permissions',
        column: 'code',
        values: [WRONG_CODE],
      });
    }

    await upsertSeedRows(queryRunner, {
      table: 'components',
      matchBy: ['code'],
      rows: [{ code: COMPONENT, name: 'Cumplimiento legal' }],
      updateColumns: [],
    });
    await upsertSeedRows(queryRunner, {
      table: 'actions',
      matchBy: ['code'],
      rows: [{ code: ACTION, name: 'Ver consentimientos' }],
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
      updateColumns: ['description'],
    });

    const permissionId = await this.idOf(queryRunner, 'permissions', CODE);
    if (!permissionId) {
      throw new Error(`${this.name}: falta el permiso ${CODE} tras sembrarlo.`);
    }

    for (const roleCode of ROLE_CODES) {
      const roleId = await this.idOf(queryRunner, 'roles', roleCode);
      // Una instalación sin roles base todavía no ha corrido `pnpm seed`; la
      // concesión la hará él con su MATRIX, así que aquí no hay nada que hacer.
      if (!roleId) continue;
      await upsertSeedRows(queryRunner, {
        table: 'role_permissions',
        matchBy: ['role_id', 'permission_id'],
        rows: [{ role_id: roleId, permission_id: permissionId }],
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const code of [CODE, WRONG_CODE]) {
      const permissionId = await this.idOf(queryRunner, 'permissions', code);
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
        values: [code],
      });
    }

    await deleteSeedRows(queryRunner, {
      table: 'actions',
      column: 'code',
      values: [ACTION, 'consents_read'],
    });
    // `components.legal` se queda: el catálogo del front ya lo describe y volver
    // a crearlo con otra migración sería ruido por un grupo que no estorba.
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
