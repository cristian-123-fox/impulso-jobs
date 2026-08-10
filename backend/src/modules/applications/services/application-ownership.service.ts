import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { CandidateApplication } from '@/modules/applications/entities/candidate-application.entity';
import {
  type ICandidateApplicationRepository,
  CANDIDATE_APPLICATION_REPOSITORY,
} from '@/modules/applications/repositories/candidate-application.repository.interface';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import {
  type ICandidateProfileRepository,
  CANDIDATE_PROFILE_REPOSITORY,
} from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '@/modules/iam/users/repositories/user.repository.interface';

/**
 * Comprobaciones de propiedad de las postulaciones. Concentra lo que AGENTS.md
 * exige en cada use-case: cuenta activa y acceso sólo a lo propio.
 *
 * El lado empresa lo resuelve `VacancyOwnershipService` (reutilizado desde
 * M10); aquí vive el lado candidato y la validación cruzada.
 */
@Injectable()
export class ApplicationOwnershipService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_APPLICATION_REPOSITORY)
    private readonly applications: ICandidateApplicationRepository,
  ) {}

  /** El rol de plataforma debe ser CANDIDATE: el guard sólo mira permisos. */
  assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo un aspirante puede gestionar sus postulaciones.',
      );
    }
  }

  /** Perfil del candidato, exigiendo cuenta activa. */
  async requireProfile(userId: string): Promise<CandidateProfile> {
    const user = await this.users.findById(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.AUTH_ACCOUNT_INACTIVE,
        'Tu cuenta no está activa.',
      );
    }

    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'Aún no has completado tu perfil de aspirante.',
      );
    }
    return profile;
  }

  /**
   * Postulación propia del candidato. Devuelve 404 también cuando es de otro
   * candidato: no se distingue "no existe" de "no es tuya".
   */
  async requireOwnApplication(
    applicationId: string,
    candidateProfileId: string,
  ): Promise<CandidateApplication> {
    const application = await this.applications.findByIdAndProfile(
      applicationId,
      candidateProfileId,
    );
    if (!application) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.APPLICATION_NOT_FOUND,
        'La postulación no existe.',
      );
    }
    return application;
  }

  /** Postulación a una vacante de esa empresa. Mismo criterio de 404. */
  async requireCompanyApplication(
    applicationId: string,
    companyId: string,
  ): Promise<CandidateApplication> {
    const application = await this.applications.findByIdAndCompany(
      applicationId,
      companyId,
    );
    if (!application) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.APPLICATION_NOT_FOUND,
        'La postulación no existe.',
      );
    }
    return application;
  }
}
