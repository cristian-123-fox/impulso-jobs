import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitNotifications1720000021000 implements MigrationInterface {
  name = 'InitNotifications1720000021000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" varchar(36) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" varchar(36) NOT NULL,
        "type" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "link" varchar(500),
        "read_at" TIMESTAMP,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_read" ON "notifications" ("user_id", "read_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
