import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ExpirePromotionsUseCase } from '@/modules/billing/use-cases/expire-promotions.use-case';
import { ExpireSubscriptionsUseCase } from '@/modules/billing/use-cases/expire-subscriptions.use-case';
import { NotifySubscriptionExpiryUseCase } from '@/modules/billing/use-cases/notify-subscription-expiry.use-case';

/**
 * Trabajo diario de facturación. No es destructivo: sólo cambia estados y
 * envía avisos.
 *
 * Hace tres cosas, en este orden:
 *  1. Caduca las promociones vencidas y revierte los distintivos (M14).
 *  2. Caduca las suscripciones cuyo periodo pagado terminó (T22).
 *  3. Avisa de las suscripciones **por vencer** (T22), en los umbrales de
 *     `SUBSCRIPTION_EXPIRY_NOTICE_DAYS`. Va después de expirar para no avisar
 *     de algo que en esta misma pasada acaba de vencer.
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
    const promotions = await app.get(ExpirePromotionsUseCase).execute();
    console.log(
      `Promociones revisadas: ${promotions.checked} · caducadas: ${promotions.expired.length}`,
    );
    for (const id of promotions.expired) {
      console.log(`  - ${id}`);
    }

    const subscriptions = await app.get(ExpireSubscriptionsUseCase).execute();
    console.log(
      `Suscripciones revisadas: ${subscriptions.checked} · caducadas: ${subscriptions.expired.length}`,
    );
    for (const id of subscriptions.expired) {
      console.log(`  - ${id}`);
    }

    const notices = await app.get(NotifySubscriptionExpiryUseCase).execute();
    console.log(
      `Suscripciones por vencer: ${notices.checked} · avisos enviados: ${notices.notified.length}`,
    );
    for (const entry of notices.notified) {
      console.log(`  - ${entry}`);
    }
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
