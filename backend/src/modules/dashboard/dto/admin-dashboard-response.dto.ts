import { ApiProperty } from '@nestjs/swagger';
import {
  DashboardPointDto,
  DashboardVacancySliceDto,
} from '@/modules/dashboard/dto/company-dashboard-response.dto';

export class AdminKpisDto {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty({ description: 'Altas dentro del periodo.' })
  newUsers!: number;

  @ApiProperty()
  totalCompanies!: number;

  @ApiProperty()
  activeVacancies!: number;

  @ApiProperty()
  totalApplications!: number;

  @ApiProperty({ description: 'Denuncias de vacante sin resolver.' })
  pendingReports!: number;
}

export class AdminSignupPointDto {
  @ApiProperty({ example: '2026-09-14' })
  date!: string;

  @ApiProperty({ description: 'Altas de aspirantes ese día.' })
  candidates!: number;

  @ApiProperty({ description: 'Altas de cuentas de empresa ese día.' })
  employers!: number;
}

export class AdminNamedSliceDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}

export class AdminRevenueDto {
  @ApiProperty({ description: 'Cobrado en el periodo (MXN, IVA incluido).' })
  amount!: number;

  @ApiProperty()
  orders!: number;
}

export class AdminRecentCompanyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ description: 'Entidad federativa, ya resuelta a su nombre.' })
  state!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminDashboardResponseDto {
  @ApiProperty()
  periodDays!: number;

  @ApiProperty({ type: AdminKpisDto })
  kpis!: AdminKpisDto;

  @ApiProperty({
    type: [AdminSignupPointDto],
    description: 'Altas por día, separadas por tipo de cuenta. Sin huecos.',
  })
  signupsTrend!: AdminSignupPointDto[];

  @ApiProperty({ type: [DashboardPointDto] })
  applicationsTrend!: DashboardPointDto[];

  @ApiProperty({ type: [AdminNamedSliceDto] })
  usersByRole!: AdminNamedSliceDto[];

  @ApiProperty({
    type: [AdminNamedSliceDto],
    description: 'Entidades federativas con más empresas registradas.',
  })
  companiesByState!: AdminNamedSliceDto[];

  @ApiProperty({ type: [DashboardVacancySliceDto] })
  vacanciesByStatus!: DashboardVacancySliceDto[];

  @ApiProperty({
    type: [AdminNamedSliceDto],
    description: 'Áreas profesionales con más vacantes publicadas.',
  })
  topAreas!: AdminNamedSliceDto[];

  @ApiProperty({ type: AdminRevenueDto })
  revenue!: AdminRevenueDto;

  @ApiProperty({ type: [AdminRecentCompanyDto] })
  recentCompanies!: AdminRecentCompanyDto[];
}
