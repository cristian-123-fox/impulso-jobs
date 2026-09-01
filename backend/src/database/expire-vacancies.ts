import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ExpireVacanciesUseCase } from '@/modules/vacancies/use-cases/expire-vacancies.use-case';

/**
 * T20: cierra las vacantes cuya vigencia venció (`pnpm vacancies:expire`).
 * Mismo patrón que `expire-promotions.ts`: contexto Nest completo para
 * reutilizar el use-case con su auditoría. Engánchalo a cron junto a
 * `billing:expire`.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const useCase = app.get(ExpireVacanciesUseCase);
    const summary = await useCase.execute();
    console.log(
      `Vacantes vencidas revisadas: ${summary.checked} · cerradas: ${summary.expired.length}`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
