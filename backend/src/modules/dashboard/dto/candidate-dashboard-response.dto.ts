import { ApiProperty } from '@nestjs/swagger';
import {
  DashboardPointDto,
  DashboardStatusSliceDto,
} from '@/modules/dashboard/dto/company-dashboard-response.dto';

export class CandidateKpisDto {
  @ApiProperty()
  totalApplications!: number;

  @ApiProperty({ description: 'Postulaciones en una etapa no terminal.' })
  activeApplications!: number;

  @ApiProperty({ description: 'Postulaciones enviadas dentro del periodo.' })
  newApplications!: number;

  @ApiProperty()
  savedVacancies!: number;
}

export class CandidateProfileTaskDto {
  @ApiProperty({ example: 'resumes' })
  key!: string;

  @ApiProperty({ example: 'Sube tu hoja de vida' })
  label!: string;

  @ApiProperty({
    description: 'Ruta del área del candidato donde se completa.',
  })
  route!: string;

  @ApiProperty()
  done!: boolean;
}

export class CandidateProfileCompletionDto {
  @ApiProperty({ description: '0–100.' })
  percent!: number;

  @ApiProperty()
  completed!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({
    type: [CandidateProfileTaskDto],
    description: 'Checklist completo, en orden; incluye lo ya hecho.',
  })
  tasks!: CandidateProfileTaskDto[];
}

export class CandidateProfileViewsDto {
  @ApiProperty({ description: 'Empresas distintas que han abierto su CV.' })
  total!: number;

  @ApiProperty({ description: 'Consultas dentro del periodo.' })
  recent!: number;

  @ApiProperty({ nullable: true })
  lastViewedAt!: string | null;
}

export class CandidateDashboardResponseDto {
  @ApiProperty()
  periodDays!: number;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ type: CandidateKpisDto })
  kpis!: CandidateKpisDto;

  @ApiProperty({ type: [DashboardPointDto] })
  applicationsTrend!: DashboardPointDto[];

  @ApiProperty({ type: [DashboardStatusSliceDto] })
  applicationsByStatus!: DashboardStatusSliceDto[];

  @ApiProperty({ type: CandidateProfileCompletionDto })
  profileCompletion!: CandidateProfileCompletionDto;

  @ApiProperty({ type: CandidateProfileViewsDto })
  profileViews!: CandidateProfileViewsDto;
}
