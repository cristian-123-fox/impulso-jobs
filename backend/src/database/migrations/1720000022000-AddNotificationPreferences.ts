import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/modules/notifications/enums/notification-preference.enum';

/**
 * T21: preferencias de notificación del candidato. Portable a
 * PostgreSQL/MySQL.
 *
 * Va en tres pasos —añadir nullable, rellenar, marcar NOT NULL— en lugar de
 * `json NOT NULL DEFAULT '...'` de una sola vez porque **MySQL 8 no admite
 * DEFAULT en columnas JSON** (error 1101); MariaDB sí, porque su `json` es un
 * alias de `longtext`. Depender de eso ataría la migración al motor. No se
 * pierde nada: la única ruta que inserta esta fila
 * (`CandidateSettingsUseCase.defaultSettings()`) siempre escribe el valor.
 *
 * Los identificadores van sin comillas: entre comillas dobles son válidos en
 * PostgreSQL, pero MySQL/MariaDB los lee como cadenas (ER_PARSE_ERROR 1064).
 */
export class AddNotificationPreferences1720000022000 implements MigrationInterface {
  name = 'AddNotificationPreferences1720000022000';

  private column(isNullable: boolean): TableColumn {
    return new TableColumn({
      name: 'notification_preferences',
      type: 'json',
      isNullable,
    });
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'candidate_profile_settings',
      this.column(true),
    );

    // Sin comillas simples dentro del JSON, así que el literal es seguro tal cual.
    const defaults = JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES);
    await queryRunner.query(
      `UPDATE candidate_profile_settings
         SET notification_preferences = '${defaults}'
       WHERE notification_preferences IS NULL`,
    );

    await queryRunner.changeColumn(
      'candidate_profile_settings',
      'notification_preferences',
      this.column(false),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      'candidate_profile_settings',
      'notification_preferences',
    );
  }
}
