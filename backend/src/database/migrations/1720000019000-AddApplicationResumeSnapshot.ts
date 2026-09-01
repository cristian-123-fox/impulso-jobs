import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * T19: snapshot del CV en la postulación — clave del archivo congelado y sus
 * metadatos. Las postulaciones existentes quedan en NULL y siguen bajando por
 * la FK viva (`resume_id`). Portable a PostgreSQL/MySQL.
 */
export class AddApplicationResumeSnapshot1720000019000 implements MigrationInterface {
  name = 'AddApplicationResumeSnapshot1720000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({
        name: 'resume_snapshot_key',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({
        name: 'resume_snapshot_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'candidate_applications',
      new TableColumn({
        name: 'resume_snapshot_mime',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      'candidate_applications',
      'resume_snapshot_mime',
    );
    await queryRunner.dropColumn(
      'candidate_applications',
      'resume_snapshot_name',
    );
    await queryRunner.dropColumn(
      'candidate_applications',
      'resume_snapshot_key',
    );
  }
}
