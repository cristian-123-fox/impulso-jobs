import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ConsolidateVacancyViewsUseCase } from '@/modules/vacancies/use-cases/consolidate-vacancy-views.use-case';

/**
 * T18: consolida los eventos de vista en `vacancies.views_count`
 * (`pnpm views:consolidate`). Engánchalo a cron una vez al día, junto a
 * `billing:expire` y `vacancies:expire`.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const useCase = app.get(ConsolidateVacancyViewsUseCase);
    const summary = await useCase.execute();
    console.log(
      `Vistas consolidadas: ${summary.views} en ${summary.vacancies} vacantes.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
