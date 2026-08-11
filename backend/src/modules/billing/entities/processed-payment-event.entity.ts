import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Idempotencia de los eventos de la pasarela.
 *
 * Un webhook puede llegar repetido o desordenado, y confirmar dos veces el
 * mismo pago activaría la promoción y otorgaría el cupo dos veces. La clave
 * primaria compuesta (proveedor + id del evento) hace que el segundo intento
 * choque contra el índice y se descarte.
 *
 * En el ER figura como `processed_stripe_events`; aquí es agnóstica del
 * proveedor porque el cobro pasa por `PaymentProviderPort`.
 */
@Entity('processed_payment_events')
export class ProcessedPaymentEvent {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  provider!: string;

  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 160 })
  eventId!: string;

  @Column({ type: 'varchar', length: 80 })
  type!: string;

  @Index('idx_processed_payment_events_processed_at')
  @Column({ name: 'processed_at', type: 'timestamp' })
  processedAt!: Date;
}
