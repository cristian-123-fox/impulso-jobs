import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type ICandidateApplicationRepository,
  CANDIDATE_APPLICATION_REPOSITORY,
} from '@/modules/applications/repositories/candidate-application.repository.interface';
import { ApplicationStatusCode } from '@/modules/applications/enums/application-status.enum';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';
import { NotificationService } from '@/modules/notifications/services/notification.service';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

/**
 * T21: notifica a los postulantes no seleccionados/rechazados cuando
 * una vacante se cierra. Vive en ApplicationsModule porque necesita
 * los repositorios de postulaciones y perfiles de candidato.
 */
@Injectable()
export class NotifyVacancyClosedUseCase {
  private readonly logger = new Logger(NotifyVacancyClosedUseCase.name);

  constructor(
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(vacancyId: string, vacancyTitle: string): Promise<void> {
    const apps = await this.applications.findByVacancy(vacancyId);
    const finalStatuses = new Set([
      ApplicationStatusCode.SELECTED,
      ApplicationStatusCode.REJECTED,
    ]);

    for (const app of apps) {
      if (finalStatuses.has(app.statusCode as ApplicationStatusCode)) continue;

      try {
        const profiles = await this.profiles.findByIds([
          app.candidateProfileId,
        ]);
        const profile = profiles[0];
        if (!profile) continue;

        const user = await this.users.findById(profile.userId);
        if (!user) continue;

        const title = 'Vacante cerrada';
        const body = `La vacante "${vacancyTitle}" ha sido cerrada. Ya no es posible continuar con tu postulación.`;
        const link = '/candidato/postulaciones';

        await this.notificationService.notify({
          userId: user.id,
          type: NotificationType.SAVED_VACANCY_CLOSED,
          title,
          body,
          link,
          sendEmail: true,
        });

        await this.notificationService.sendNotificationEmail(
          user.email,
          title,
          body,
          link,
        );
      } catch (error) {
        this.logger.error(
          `Error notificando al postulante ${app.id} en cierre de vacante: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
