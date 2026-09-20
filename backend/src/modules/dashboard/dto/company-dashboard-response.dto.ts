import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({ description: 'Vacantes en estado ACTIVE.' })
  activeVacancies!: number;

  @ApiProperty({ description: 'Vacantes publicadas alguna vez.' })
  totalVacancies!: number;

  @ApiProperty()
  totalApplications!: number;

  @ApiProperty({ description: 'Postulaciones recibidas dentro del periodo.' })
  newApplications!: number;

  @ApiProperty({
    description: 'Postulaciones que nadie de la empresa ha abierto.',
  })
  unreadApplications!: number;

  @ApiProperty({
    description:
      'Vistas consolidadas de todas sus vacantes (se suman una vez al día).',
  })
  totalViews!: number;
}

export class DashboardPointDto {
  @ApiProperty({ example: '2026-09-14' })
  date!: string;

  @ApiProperty()
  count!: number;
}

export class DashboardStatusSliceDto {
  @ApiProperty({ example: 'IN_REVIEW' })
  code!: string;

  @ApiProperty({ example: 'En revisión' })
  name!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ description: 'Estado terminal del proceso.' })
  isFinal!: boolean;
}

export class DashboardVacancySliceDto {
  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty()
  count!: number;
}

export class DashboardTopVacancyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  applications!: number;

  @ApiProperty()
  views!: number;
}

export class DashboardExpiringVacancyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ description: 'Días completos que faltan. 0 = vence hoy.' })
  daysLeft!: number;

  @ApiProperty()
  applications!: number;
}

export class DashboardQuotaDto {
  @ApiProperty({ description: '-1 si el plan da visitas ilimitadas.' })
  totalVisits!: number;

  @ApiProperty()
  usedVisits!: number;

  @ApiProperty({ description: '-1 = ilimitado.' })
  remainingVisits!: number;

  @ApiProperty()
  unlimited!: boolean;
}

export class DashboardPlanDto {
  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({
    nullable: true,
    description: 'Fin del periodo vigente (ISO).',
  })
  endsAt!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Días hasta el fin del periodo. Negativo si ya venció.',
  })
  daysLeft!: number | null;

  @ApiProperty()
  autoRenew!: boolean;
}

export class CompanyDashboardResponseDto {
  @ApiProperty({ description: 'Días que cubre la serie y `newApplications`.' })
  periodDays!: number;

  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({
    type: [DashboardPointDto],
    description:
      'Serie diaria **sin huecos**: los días sin postulaciones van a 0.',
  })
  applicationsTrend!: DashboardPointDto[];

  @ApiProperty({ type: [DashboardStatusSliceDto] })
  applicationsByStatus!: DashboardStatusSliceDto[];

  @ApiProperty({ type: [DashboardVacancySliceDto] })
  vacanciesByStatus!: DashboardVacancySliceDto[];

  @ApiProperty({ type: [DashboardTopVacancyDto] })
  topVacancies!: DashboardTopVacancyDto[];

  @ApiProperty({ type: [DashboardExpiringVacancyDto] })
  expiringVacancies!: DashboardExpiringVacancyDto[];

  @ApiProperty({ type: DashboardQuotaDto })
  talentQuota!: DashboardQuotaDto;

  @ApiProperty({ type: DashboardPlanDto, nullable: true })
  plan!: DashboardPlanDto | null;
}
