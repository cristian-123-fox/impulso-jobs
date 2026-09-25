import { Inject, Injectable, Logger } from '@nestjs/common';
import { Role } from '@/common/types/role.enum';
import { PromotionOrder } from '@/modules/billing/entities/promotion-order.entity';
import { PaymentStatus } from '@/modules/billing/enums/billing.enums';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { NotificationService } from '@/modules/notifications/services/notification.service';

/** Proveedor cuyo cobro sólo se cierra a mano desde `/admin/pagos`. */
const MANUAL_PROVIDER = 'manual';

/**
 * Avisa a los administradores de que hay un pago esperando confirmación.
 *
 * Sólo tiene sentido con el adaptador manual: ahí nadie más va a cerrar la
 * orden, y sin el aviso la empresa se queda con su compra pendiente hasta que
 * alguien entre por casualidad a `/admin/pagos`. Con una pasarela real el
 * webhook liquida solo, y avisar sería ruido — por eso se filtra por proveedor
 * y no se deja al llamador.
 *
 * **Best-effort**, como `CompanySubscriptionNotifier`: el cobro ya se abrió y
 * un fallo al notificar no debe devolverle un error a la empresa.
 */
@Injectable()
export class PaymentQueueNotifier {
  private readonly logger = new Logger(PaymentQueueNotifier.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly notifications: NotificationService,
  ) {}

  async notifyPending(order: PromotionOrder, concept: string): Promise<void> {
    if (order.provider !== MANUAL_PROVIDER) return;
    if (order.paymentStatus !== PaymentStatus.AWAITING_PAYMENT) return;

    try {
      const [admins] = await this.users.findAndCount({
        role: Role.ADMIN,
        page: 1,
        limit: 100,
      });

      const title = 'Pago pendiente de confirmar';
      const body = `${concept} · ${order.total} ${order.currency}. Confírmalo o recházalo cuando verifiques el cobro.`;
      const link = '/admin/pagos';

      for (const admin of admins) {
        await this.notifications.notify({
          userId: admin.id,
          type: NotificationType.PAYMENT_PENDING_CONFIRM,
          title,
          body,
          link,
          sendEmail: true,
        });
        await this.notifications.sendNotificationEmail(
          admin.email,
          title,
          body,
          link,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo avisar del pago pendiente ${order.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
