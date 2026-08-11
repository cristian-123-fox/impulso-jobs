import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ExpirePromotionsUseCase } from '@/modules/billing/use-cases/expire-promotions.use-case';

/**
 * Caduca las promociones vencidas y revierte los distintivos de sus vacantes
 * (M14). No es destructivo: sólo cambia estados.
 *
 * No hay planificador en el proyecto, así que esto se engancha a un cron del
 * servidor (en cPanel, una tarea diaria):
 *
 *   pnpm billing:expire
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const useCase = app.get(ExpirePromotionsUseCase);
    const summary = await useCase.execute();
    console.log(
      `Promociones revisadas: ${summary.checked} · caducadas: ${summary.expired.length}`,
    );
    for (const id of summary.expired) {
      console.log(`  - ${id}`);
    }
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
