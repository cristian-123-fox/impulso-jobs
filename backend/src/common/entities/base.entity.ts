import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base de todas las entidades: id UUID v4 generado en la aplicación (portable a
 * PostgreSQL y MySQL sin extensiones de BD, `char(36)`), y timestamps con
 * soft-delete. Solo mapeo — sin lógica de dominio.
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @BeforeInsert()
  protected generateId(): void {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
