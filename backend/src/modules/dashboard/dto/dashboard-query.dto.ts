import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Ventanas ofrecidas por la UI. Cerrado a propósito: no es un número libre. */
export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export const DEFAULT_DASHBOARD_PERIOD = 30;

export class DashboardQueryDto {
  /**
   * Días que cubren la serie temporal y el contador de "nuevas". Se valida
   * contra una lista cerrada: un rango libre invita a pedir 3.650 días y
   * dibujar diez años de puntos en el navegador.
   */
  @ApiPropertyOptional({
    enum: DASHBOARD_PERIODS,
    default: DEFAULT_DASHBOARD_PERIOD,
  })
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS, { message: 'El periodo debe ser 7, 30 o 90 días.' })
  days?: number;
}
