import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';

/**
 * Ejecuta o revierte migraciones usando el `AppDataSource`.
 * Uso: `ts-node run-migrations.ts run` | `ts-node run-migrations.ts revert`.
 */
async function main(): Promise<void> {
  const action = process.argv[2] ?? 'run';
  await AppDataSource.initialize();
  try {
    if (action === 'revert') {
      await AppDataSource.undoLastMigration();
      console.log('Última migración revertida.');
    } else {
      const ran = await AppDataSource.runMigrations();
      console.log(
        ran.length
          ? `Migraciones ejecutadas: ${ran.map((m) => m.name).join(', ')}`
          : 'No hay migraciones pendientes.',
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
