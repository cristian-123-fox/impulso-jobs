import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOptionsWhere,
  ILike,
  In,
  Repository,
} from 'typeorm';
import { BaseRepository } from '@/common/repositories/base.repository';
import { buildOrder } from '@/common/utils/sort.util';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import {
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';
import {
  CONSENT_SORT_COLUMNS,
  type ConsentSearchCriteria,
  type ConsentSummary,
  ILegalConsentRepository,
} from '@/modules/legal/repositories/legal-consent.repository.interface';

/** Códigos de los tres documentos que aparecen en el resumen del back-office. */
const SUMMARY_DOCUMENTS = {
  activeTerms: LegalDocumentCode.TERMS,
  activePrivacy: LegalDocumentCode.PRIVACY,
  activeImageRights: LegalDocumentCode.IMAGE_RIGHTS,
} as const;

@Injectable()
export class LegalConsentRepository
  extends BaseRepository<LegalConsent>
  implements ILegalConsentRepository
{
  constructor(@InjectRepository(LegalConsent) repo: Repository<LegalConsent>) {
    super(repo);
  }

  async create(
    consent: Partial<LegalConsent>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.repo(manager);
    await repo.save(repo.create(consent));
  }

  async listBySubject(
    userId: string | null,
    subjectEmail: string | null,
    limit: number,
  ): Promise<LegalConsent[]> {
    const where = this.subjectWhere(userId, subjectEmail);
    if (where.length === 0) return [];

    return this.repo().find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async hasActiveConsent(
    userId: string | null,
    subjectEmail: string | null,
    documentCode: LegalDocumentCode,
  ): Promise<boolean> {
    const where = this.subjectWhere(userId, subjectEmail);
    if (where.length === 0) return false;

    // Sólo cuenta lo aceptado después de la última negativa, así que se lee la
    // fila más reciente de ese documento en vez de preguntar "¿existe alguna
    // aceptada?". Con una revocación posterior, esa fila viene con
    // `granted = false` y el resultado es correcto sin tocar nada más.
    const rows = await this.repo().find({
      where: where.map((w) => ({ ...w, documentCode })),
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return rows[0]?.granted === true;
  }

  async findLatestByCodes(
    userId: string | null,
    subjectEmail: string | null,
    documentCodes: readonly LegalDocumentCode[],
  ): Promise<LegalConsent[]> {
    if (documentCodes.length === 0) return [];

    const where = this.subjectWhere(userId, subjectEmail);
    if (where.length === 0) return [];

    const rows = await this.repo().find({
      where: where.map((w) => ({
        ...w,
        documentCode: In([...documentCodes]),
      })),
      order: { createdAt: 'DESC' },
    });

    // Se queda la primera fila de cada código. `find` no tiene forma de pedir
    // "el máximo por grupo", y el historial de un titular son pocas filas: se
    // lee una vez y se agrupa aquí.
    const latest = new Map<LegalDocumentCode, LegalConsent>();
    for (const row of rows) {
      if (!latest.has(row.documentCode)) latest.set(row.documentCode, row);
    }

    return [...latest.values()];
  }

  async findAndCount(
    criteria: ConsentSearchCriteria,
  ): Promise<[LegalConsent[], number]> {
    const where = this.buildWhere(criteria);

    return this.repo().findAndCount({
      where,
      order: buildOrder<LegalConsent>(
        criteria.sortBy,
        criteria.sortOrder,
        CONSENT_SORT_COLUMNS,
        // Lo más reciente primero es lo que se busca el 99 % de las veces: entra
        // un usuario nuevo y se comprueba qué aceptó hace un minuto.
        { createdAt: 'DESC' },
      ),
      skip: (criteria.page - 1) * criteria.limit,
      take: criteria.limit,
    });
  }

  async summarize(
    criteria: Omit<
      ConsentSearchCriteria,
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): Promise<ConsentSummary> {
    const base = this.buildWhere(criteria);

    const [total, granted] = await Promise.all([
      this.repo().count({ where: base }),
      this.repo().count({ where: [{ ...base, granted: true }] }),
    ]);

    // Los tres "activos" no se pueden contar con un `count({ granted: true })`:
    // revocar inserta una fila, así que ese recuento es histórico y no vigente.
    // Lo vigente es la última fila de cada titular para cada documento.
    const [activeTerms, activePrivacy, activeImageRights] = await Promise.all(
      Object.values(SUMMARY_DOCUMENTS).map((code) => this.countActiveFor(code)),
    );

    return {
      total,
      granted,
      denied: total - granted,
      activeTerms,
      activePrivacy,
      activeImageRights,
    };
  }

  /**
   * Titulares cuya **última** fila para este documento dice `granted = true`.
   *
   * Se hace en dos consultas y no con un `GROUP BY` sobre `MAX(created_at)`: esa
   * forma cuenta mal cuando dos filas comparten marca de tiempo (una importación
   * puede generarlas), porque devolvería el mismo titular dos veces o ninguna.
   * Trayendo los candidatos y filtrando en memoria, cada titular aparece una
   * sola vez porque el `order` + `reduce` se queda con la primera fila de cada
   * `user_id`. La tabla del listado está paginada, así que el volumen acotado es
   * el de una pantalla, no el de toda la base.
   */
  private async countActiveFor(
    documentCode: LegalDocumentCode,
  ): Promise<number> {
    const rows = await this.repo().find({
      where: { documentCode },
      order: { createdAt: 'DESC' },
      select: { userId: true, subjectEmail: true, granted: true },
    });

    const seen = new Set<string>();
    let active = 0;

    for (const row of rows) {
      const key = row.userId ?? row.subjectEmail ?? 'sin-titular';
      if (seen.has(key)) continue;
      seen.add(key);
      if (row.granted) active += 1;
    }

    return active;
  }

  private buildWhere(
    criteria: Omit<
      ConsentSearchCriteria,
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): FindOptionsWhere<LegalConsent> {
    const where: FindOptionsWhere<LegalConsent> = {};

    if (criteria.documentCode) where.documentCode = criteria.documentCode;
    if (criteria.granted !== undefined) where.granted = criteria.granted;
    if (criteria.source) {
      // El filtro llega como texto libre desde la query string; se castea porque
      // la columna es un enum y TypeORM no acepta un string suelto.
      where.source = criteria.source as ConsentSource;
    }

    const search = criteria.search?.trim();
    if (search) {
      // Búsqueda por correo del titular. Es lo único que un operador tiene
      // razonablemente a mano cuando le piden comprobar qué aceptó alguien.
      where.subjectEmail = ILike(`%${search}%`);
    }

    return where;
  }

  /**
   * Un titular puede llegar por sesión o por correo (los flujos sin cuenta).
   * Se generan dos condiciones en vez de una: con `OR` de dos `undefined`
   * TypeORM interpretaría el filtro como "sin filtro".
   */
  private subjectWhere(
    userId: string | null,
    subjectEmail: string | null,
  ): FindOptionsWhere<LegalConsent>[] {
    const where: FindOptionsWhere<LegalConsent>[] = [];
    if (userId) where.push({ userId });
    if (subjectEmail) where.push({ subjectEmail });
    return where;
  }
}
