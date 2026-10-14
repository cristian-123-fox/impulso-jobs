import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LegalDocumentCode } from '@/modules/legal/enums/legal.enums';

/**
 * Registro maestro de los documentos legales y sus versiones.
 *
 * Existe para que un consentimiento no sea una cadena suelta en el cliente: el
 * front declara qué versión está mostrando y la API la valida contra esta
 * tabla. Si el despliegue se descuadra (el front va dos versiones por delante
 * del backend, o al revés) el registro de consentimiento sale rechazado en vez
 * de guardarse una aceptación sobre un texto que nadie puede volver a leer.
 *
 * El **texto vive en el front**, no aquí: es contenido editorial, se escribe en
 * español e inglés, y meterlo en la base obligaría a editar por migración cada
 * vez que se corrige una coma. Lo que esta tabla fija es la identidad del
 * documento (código + versión + fecha de entrada en vigor) y la huella que el
 * cliente declaró al aceptar, que es lo que sirve como evidencia forense.
 */
@Entity('legal_documents')
@Unique('uq_legal_documents_code_version', ['code', 'version'])
@Index('idx_legal_documents_current', ['code', 'isCurrent'])
export class LegalDocument extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  code!: LegalDocumentCode;

  /** Semver abreviado (`1.0.0`). Libre, pero comparable como texto. */
  @Column({ type: 'varchar', length: 20 })
  version!: string;

  /** `es` | `en`. El aviso integral se publica en ambos (art. 16 LFPDPPP). */
  @Column({ type: 'varchar', length: 5, default: 'es' })
  locale!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  /** Fecha en que esta versión empieza a ser la exigible. */
  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate!: string;

  /**
   * SHA-256 del texto que el cliente dice haber mostrado. Lo declara el front y
   * se copia a `legal_consents`: no sirve para verificar contra el original
   * (el original no está aquí) sino para detectar que dos aceptaciones del
   * mismo documento no fueron sobre el mismo texto.
   */
  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash?: string | null;

  /** Versión vigente. La API rechaza consentimientos sobre una que no lo sea. */
  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent!: boolean;

  /**
   * Documento cuya negativa impide usar el servicio (Términos, Aviso). Si es
   * `false`, el consentimiento es accesorio y su negativa no bloquea nada.
   */
  @Column({
    name: 'blocks_registration',
    type: 'boolean',
    default: true,
  })
  blocksRegistration!: boolean;
}
