import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * T21: notificaciones en plataforma. Portable a PostgreSQL/MySQL.
 *
 * Se escribe con la API `Table`/`TableIndex` y no con SQL a pelo: los
 * identificadores entre comillas dobles son válidos en PostgreSQL pero
 * MySQL/MariaDB los lee como literales de cadena y responde ER_PARSE_ERROR
 * (1064). La API cita con el carácter de cada motor.
 */
export class InitNotifications1720000021000 implements MigrationInterface {
  name = 'InitNotifications1720000021000';

  private timestamps() {
    return [
      {
        name: 'created_at',
        type: 'timestamp',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        isNullable: false,
        default: 'CURRENT_TIMESTAMP',
      },
      { name: 'deleted_at', type: 'timestamp', isNullable: true },
    ];
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'body', type: 'text' },
          {
            name: 'link',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          { name: 'read_at', type: 'timestamp', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'idx_notifications_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'idx_notifications_user_read',
        columnNames: ['user_id', 'read_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notifications', true);
  }
}
