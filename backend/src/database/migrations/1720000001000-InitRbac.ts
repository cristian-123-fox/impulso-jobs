import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Esquema RBAC (M2): roles, components, actions, permissions, role_permissions,
 * user_roles. Portable (QueryRunner/Table); IDs UUID v4 en `varchar(36)`.
 */
export class InitRbac1720000001000 implements MigrationInterface {
  name = 'InitRbac1720000001000';

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

  private codeTable(name: string, codeLen: string, nameLen: string): Table {
    return new Table({
      name,
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'code', type: 'varchar', length: codeLen, isNullable: false },
        { name: 'name', type: 'varchar', length: nameLen, isNullable: false },
        ...this.timestamps(),
      ],
    });
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // roles
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'code', type: 'varchar', length: '40', isNullable: false },
          { name: 'name', type: 'varchar', length: '80', isNullable: false },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_system',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'roles',
      new TableIndex({
        name: 'uq_roles_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    // components / actions
    await queryRunner.createTable(
      this.codeTable('components', '60', '120'),
      true,
    );
    await queryRunner.createIndex(
      'components',
      new TableIndex({
        name: 'uq_components_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );
    await queryRunner.createTable(this.codeTable('actions', '60', '120'), true);
    await queryRunner.createIndex(
      'actions',
      new TableIndex({
        name: 'uq_actions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    // permissions
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'code', type: 'varchar', length: '120', isNullable: false },
          {
            name: 'component_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'action_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'uq_permissions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'permissions',
      new TableForeignKey({
        name: 'fk_permissions_component',
        columnNames: ['component_id'],
        referencedTableName: 'components',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'permissions',
      new TableForeignKey({
        name: 'fk_permissions_action',
        columnNames: ['action_id'],
        referencedTableName: 'actions',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // role_permissions
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'role_id', type: 'varchar', length: '36', isNullable: false },
          {
            name: 'permission_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'idx_role_permissions_role_id',
        columnNames: ['role_id'],
      }),
    );
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'uq_role_permissions',
        columnNames: ['role_id', 'permission_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'fk_role_permissions_role',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        name: 'fk_role_permissions_permission',
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // user_roles
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'user_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'role_id', type: 'varchar', length: '36', isNullable: false },
          ...this.timestamps(),
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'idx_user_roles_user_id',
        columnNames: ['user_id'],
      }),
    );
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'uq_user_roles_user_role',
        columnNames: ['user_id', 'role_id'],
        isUnique: true,
      }),
    );
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'fk_user_roles_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        name: 'fk_user_roles_role',
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_roles', true);
    await queryRunner.dropTable('role_permissions', true);
    await queryRunner.dropTable('permissions', true);
    await queryRunner.dropTable('actions', true);
    await queryRunner.dropTable('components', true);
    await queryRunner.dropTable('roles', true);
  }
}
