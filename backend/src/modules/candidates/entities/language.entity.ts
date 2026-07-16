import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Catálogo simple de idiomas permitido para el perfil candidato. */
@Entity('languages')
export class Language {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;
}
