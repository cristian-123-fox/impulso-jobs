import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVacancyImageUrl1720000024000 implements MigrationInterface {
  name = 'AddVacancyImageUrl1720000024000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vacancies"
      ADD COLUMN "image_url" varchar(500) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "vacancies"
      DROP COLUMN "image_url"
    `);
  }
}
