import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/modules/notifications/enums/notification-preference.enum';

export class AddNotificationPreferences1720000022000 implements MigrationInterface {
  name = 'AddNotificationPreferences1720000022000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const defaultValue = JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES);
    await queryRunner.query(`
      ALTER TABLE "candidate_profile_settings"
      ADD COLUMN "notification_preferences" json NOT NULL DEFAULT '${defaultValue}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "candidate_profile_settings"
      DROP COLUMN "notification_preferences"
    `);
  }
}
