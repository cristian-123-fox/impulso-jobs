import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  VacancyReportReason,
  VacancyReportStatus,
} from '@/modules/vacancies/enums/vacancy-report.enums';

/** Denuncia de una vacante por un candidato. Una por usuario y vacante. */
@Entity('vacancy_reports')
@Index('uq_vacancy_reports_vacancy_reporter', ['vacancyId', 'reporterUserId'], {
  unique: true,
})
export class VacancyReport extends BaseEntity {
  @Index('idx_vacancy_reports_vacancy_id')
  @Column({ name: 'vacancy_id', type: 'varchar', length: 36 })
  vacancyId!: string;

  @Column({ name: 'reporter_user_id', type: 'varchar', length: 36 })
  reporterUserId!: string;

  @Column({ name: 'reason_code', type: 'varchar', length: 40 })
  reasonCode!: VacancyReportReason;

  @Column({ name: 'comment', type: 'varchar', length: 500, nullable: true })
  comment?: string | null;

  @Index('idx_vacancy_reports_status')
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: VacancyReportStatus.PENDING,
  })
  status!: VacancyReportStatus;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;
}
