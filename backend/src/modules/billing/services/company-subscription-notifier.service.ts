import { Inject, Injectable, Logger } from '@nestjs/common';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';
import {
  type ICompanyUserRepository,
  COMPANY_USER_REPOSITORY,
} from '@/modules/companies/repositories/company-user.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { NotificationService } from '@/modules/notifications/services/notification.service';

/** Quién recibe los avisos de plan: los que mandan sobre el dinero. */
const NOTIFIED_MEMBER_ROLES = [
  CompanyMemberRole.OWNER,
  CompanyMemberRole.ADMIN,
];

export interface CompanyNotice {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Avisa al equipo que manda en una empresa (OWNER/ADMIN) de un cambio en su
 * plan. Lo usa T34: un plan que aparece, cambia o desaparece sin avisar se
 * descubre cuando algo deja de funcionar, que es justo lo que hay que evitar.
 *
 * **Best-effort**: un fallo al notificar no debe tumbar la operación de
 * negocio — el plan ya se asignó y la auditoría ya lo registró.
 *
 * ⚠️ `NotifySubscriptionExpiryUseCase` (T22) resuelve los destinatarios con su
 * propia copia privada de esta lógica, anterior a este servicio. Si tocas los
 * criterios de destinatario, mira también allí; migrarlo aquí es un cambio
 * pendiente que no entraba en el alcance de T34.
 */
@Injectable()
export class CompanySubscriptionNotifier {
  private readonly logger = new Logger(CompanySubscriptionNotifier.name);

  constructor(
    @Inject(COMPANY_USER_REPOSITORY)
    private readonly companyUsers: ICompanyUserRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly notifications: NotificationService,
  ) {}

  /** Notifica en plataforma y por correo. Devuelve a cuántos se avisó. */
  async notifyCompany(
    companyId: string,
    notice: CompanyNotice,
  ): Promise<number> {
    try {
      const recipients = await this.recipients(companyId);
      for (const user of recipients) {
        await this.notifications.notify({
          userId: user.id,
          type: notice.type,
          title: notice.title,
          body: notice.body,
          link: notice.link,
          sendEmail: true,
        });
        await this.notifications.sendNotificationEmail(
          user.email,
          notice.title,
          notice.body,
          notice.link,
        );
      }
      return recipients.length;
    } catch (error) {
      this.logger.error(
        `No se pudo avisar a la empresa ${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  /**
   * Quien manda en la empresa (OWNER/ADMIN). Si no hay ninguno —datos viejos o
   * equipo mal formado— se avisa a todo el equipo antes que a nadie.
   */
  private async recipients(
    companyId: string,
  ): Promise<{ id: string; email: string }[]> {
    const members = await this.companyUsers.findByCompanyId(companyId);
    if (members.length === 0) return [];

    const managers = members.filter((member) =>
      NOTIFIED_MEMBER_ROLES.includes(member.role),
    );
    const targets = managers.length > 0 ? managers : members;

    const resolved: { id: string; email: string }[] = [];
    for (const member of targets) {
      const user = await this.users.findById(member.userId);
      if (user) resolved.push({ id: user.id, email: user.email });
    }
    return resolved;
  }
}
