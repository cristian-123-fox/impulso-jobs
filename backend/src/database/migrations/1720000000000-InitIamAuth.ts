import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Esquema inicial de IAM/Auth + auditoría: users, tokens_users, blacklist_tokens
 * y audit_logs. Definido con la API de `QueryRunner`/`Table` para ser portable a
 * PostgreSQL y MySQL. IDs UUID v4 generados en la app (`varchar(36)`).
 */
export class InitIamAuth1720000000000 implements MigrationInterface {
  name = 'InitIamAuth1720000000000';

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
        name: 'users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'CANDIDATE'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'ACTIVE'",
          },
          {
            name: 'failed_attempts',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          { name: 'blocked_until', type: 'timestamp', isNullable: true },
          { name: 'last_login', type: 'timestamp', isNullable: true },
          {
            name: 'last_login_ip',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'last_login_device',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'email_verified_at', type: 'timestamp', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'uq_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'tokens_users',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36', isNullable: false },
          {
            name: 'token_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'refresh'",
          },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          {
            name: 'revoked',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'tokens_users',
      new TableIndex({
        name: 'idx_tokens_users_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createForeignKey(
      'tokens_users',
      new TableForeignKey({
        name: 'fk_tokens_users_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'blacklist_tokens',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'jti', type: 'varchar', length: '36', isNullable: false },
          {
            name: 'token_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          { name: 'expires_at', type: 'timestamp', isNullable: true },
          { name: 'reason', type: 'varchar', length: '40', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'blacklist_tokens',
      new TableIndex({
        name: 'uq_blacklist_tokens_jti',
        columnNames: ['jti'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          {
            name: 'actor_user_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'action', type: 'varchar', length: '80', isNullable: false },
          { name: 'entity', type: 'varchar', length: '60', isNullable: true },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          { name: 'ip', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'metadata', type: 'text', isNullable: true },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'idx_audit_logs_action',
        columnNames: ['action'],
      }),
    );
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'fk_audit_logs_actor',
        columnNames: ['actor_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs', true);
    await queryRunner.dropTable('blacklist_tokens', true);
    await queryRunner.dropTable('tokens_users', true);
    await queryRunner.dropTable('users', true);
  }
}
