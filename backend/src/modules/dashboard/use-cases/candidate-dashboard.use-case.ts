import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  type IApplicationStatusRepository,
  APPLICATION_STATUS_REPOSITORY,
} from '@/modules/applications/repositories/application-status.repository.interface';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { CandidateDashboardResponseDto } from '@/modules/dashboard/dto/candidate-dashboard-response.dto';
import {
  type ICandidateDashboardRepository,
  CANDIDATE_DASHBOARD_REPOSITORY,
  ProfileSectionCounts,
} from '@/modules/dashboard/repositories/candidate-dashboard.repository.interface';
import {
  fillDailyGaps,
  periodStart,
} from '@/modules/dashboard/use-cases/period.util';

export interface CandidateDashboardQuery {
  userId: string;
  days: number;
}

interface ProfileTask {
  key: string;
  label: string;
  route: string;
  done: boolean;
}

/**
 * Panel de inicio del aspirante.
 *
 * Su valor no son los números —quien tiene tres postulaciones no necesita una
 * gráfica para contarlas— sino dos cosas que hoy no ve en ningún sitio: **qué
 * le falta por completar** de su perfil y **cuántas empresas han abierto su
 * CV**. Lo segundo sale de `talent_access_views`, que existe para el cupo de
 * las empresas y de paso responde la pregunta que todo aspirante se hace.
 */
@Injectable()
export class CandidateDashboardUseCase {
  constructor(
    @Inject(CANDIDATE_DASHBOARD_REPOSITORY)
    private readonly dashboard: ICandidateDashboardRepository,
    @Inject(APPLICATION_STATUS_REPOSITORY)
    private readonly statuses: IApplicationStatusRepository,
  ) {}

  async execute(
    query: CandidateDashboardQuery,
    now = new Date(),
  ): Promise<CandidateDashboardResponseDto> {
    const profile = await this.dashboard.findProfileByUserId(query.userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'No existe un perfil de candidato para este usuario.',
      );
    }

    const from = periodStart(now, query.days);

    const [
      totalApplications,
      byStatus,
      trend,
      savedVacancies,
      sections,
      views,
      statusCatalog,
    ] = await Promise.all([
      this.dashboard.countApplications(profile.id),
      this.dashboard.countApplicationsByStatus(profile.id),
      this.dashboard.applicationsPerDay(profile.id, from, now),
      this.dashboard.countSavedVacancies(profile.id),
      this.dashboard.profileSections(profile.id),
      this.dashboard.profileViews(profile.id, from),
      this.statuses.findAll(),
    ]);

    const counts = new Map(byStatus.map((row) => [row.key, row.count]));
    const applicationsByStatus = statusCatalog.map((status) => ({
      code: status.code,
      name: status.name,
      count: counts.get(status.code) ?? 0,
      isFinal: status.isFinal,
    }));

    // "En proceso" = todo lo que no está en un estado terminal. Es el número
    // que de verdad le importa: cuántas candidaturas siguen vivas.
    const activeApplications = applicationsByStatus
      .filter((status) => !status.isFinal)
      .reduce((total, status) => total + status.count, 0);

    const points = fillDailyGaps(trend, from, now);

    return {
      periodDays: query.days,
      firstName: profile.firstName,
      kpis: {
        totalApplications,
        activeApplications,
        newApplications: points.reduce(
          (total, point) => total + point.count,
          0,
        ),
        savedVacancies,
      },
      applicationsTrend: points,
      applicationsByStatus,
      profileCompletion: buildCompletion(profile, sections),
      profileViews: {
        total: views.total,
        recent: views.recent,
        lastViewedAt: views.lastViewedAt?.toISOString() ?? null,
      },
    };
  }
}

/**
 * Completitud del perfil como **lista de tareas**, no como un porcentaje
 * suelto: un 60 % no dice qué hacer, y "sube tu hoja de vida" sí. Cada tarea
 * enlaza a la pantalla donde se resuelve.
 *
 * Los pesos son todos iguales a propósito. Ponderar (que el CV valga el doble)
 * obliga a explicar la fórmula en la interfaz; con tareas iguales, el número
 * sube de forma predecible cada vez que se completa una.
 */
function buildCompletion(
  profile: CandidateProfile,
  sections: ProfileSectionCounts,
): CandidateDashboardResponseDto['profileCompletion'] {
  const tasks: ProfileTask[] = [
    {
      key: 'photo',
      label: 'Añade tu foto',
      route: '/candidato/perfil',
      done: Boolean(profile.profilePhotoUrl),
    },
    {
      key: 'professionalTitle',
      label: 'Escribe tu título profesional',
      route: '/candidato/perfil',
      done: Boolean(profile.professionalTitle?.trim()),
    },
    {
      key: 'summary',
      label: 'Cuenta tu experiencia en un resumen',
      route: '/candidato/perfil',
      done: Boolean(profile.summary?.trim()),
    },
    {
      key: 'phone',
      label: 'Agrega un teléfono de contacto',
      route: '/candidato/perfil',
      done: Boolean(profile.phone?.trim()),
    },
    {
      key: 'experiences',
      label: 'Registra tu experiencia laboral',
      route: '/candidato/perfil',
      done: sections.experiences > 0,
    },
    {
      key: 'educations',
      label: 'Registra tu formación académica',
      route: '/candidato/perfil',
      done: sections.educations > 0,
    },
    {
      key: 'skills',
      label: 'Declara tus habilidades',
      route: '/candidato/perfil',
      done: sections.skills > 0,
    },
    {
      key: 'languages',
      label: 'Añade los idiomas que hablas',
      route: '/candidato/perfil',
      done: sections.languages > 0,
    },
    {
      key: 'resumes',
      label: 'Sube tu hoja de vida',
      route: '/candidato/cv',
      done: sections.resumes > 0,
    },
  ];

  const completed = tasks.filter((task) => task.done).length;
  return {
    percent: Math.round((completed / tasks.length) * 100),
    completed,
    total: tasks.length,
    tasks,
  };
}
