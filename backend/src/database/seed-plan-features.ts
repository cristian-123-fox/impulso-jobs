import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import { PlanFeature } from '@/modules/billing/entities/plan-feature.entity';
import {
  FeatureValueType,
  PlanFeatureCode,
} from '@/modules/billing/enums/billing.enums';

/**
 * Semilla del **catálogo de beneficios** (M14), tomada de
 * `Impulso_Jobs_Planes_Suscripciones.md` §4.
 *
 * Siembra sólo los códigos y su tipo: **no crea planes ni precios**. Los
 * planes Media/Alta/Anual los da de alta un administrador desde
 * `/admin/plans`, porque los precios en MXN y el alcance de la Anual son
 * decisiones de negocio todavía abiertas (§7 del mismo documento).
 *
 * Ejecutar: `pnpm seed:plan-features`. Idempotente.
 */

interface FeatureSeed {
  code: string;
  name: string;
  description: string;
  valueType: FeatureValueType;
  sortOrder: number;
}

const FEATURES: readonly FeatureSeed[] = [
  {
    code: PlanFeatureCode.VERIFIED_PUBLICATION,
    name: 'Publicación verificada',
    description: 'La oferta se muestra con el distintivo de verificada.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 1,
  },
  {
    code: PlanFeatureCode.SCREENING_QUESTIONS,
    name: 'Preguntas de filtrado',
    description: 'Cuestionario de screening por vacante.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 2,
  },
  {
    code: PlanFeatureCode.AUTO_REJECTION_MESSAGE,
    name: 'Mensaje automático a no seleccionados',
    description: 'Aviso automático al cerrar la vacante.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 3,
  },
  {
    code: PlanFeatureCode.APPLICANT_CONTACT_DATA,
    name: 'Contacto de los postulados',
    description: 'Correo y teléfono de quienes ya postularon.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 4,
  },
  {
    code: PlanFeatureCode.FEATURED_RANKING,
    name: 'Oferta destacada',
    description: 'Aparece en los primeros lugares del portal.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 5,
  },
  {
    code: PlanFeatureCode.URGENT_CONFIDENTIAL_BADGE,
    name: 'Etiqueta urgente / confidencial',
    description: 'Permite marcar la vacante como urgente o confidencial.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 6,
  },
  {
    code: PlanFeatureCode.SOCIAL_MEDIA_DISTRIBUTION,
    name: 'Difusión en redes sociales',
    description: 'La oferta se comparte en las redes de Impulso Jobs.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 7,
  },
  {
    code: PlanFeatureCode.TALENT_DB_ACCESS,
    name: 'Acceso a la base de talento',
    description: 'Visitas a hojas de vida de candidatos. -1 = ilimitado.',
    valueType: FeatureValueType.NUMERIC,
    sortOrder: 8,
  },
  {
    code: PlanFeatureCode.AI_CANDIDATE_MATCHING,
    name: 'Matching de candidatos con IA',
    description: 'Sugerencia y ranking de candidatos.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 9,
  },
  {
    code: PlanFeatureCode.AI_JOB_CREATION,
    name: 'Creación de ofertas con IA',
    description: 'Genera el borrador de la vacante. Pendiente de confirmar.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 10,
  },
  {
    code: PlanFeatureCode.PAUSE_REACTIVATE,
    name: 'Pausar / reactivar / refrescar',
    description: 'Número de pausas permitidas sobre la vacante.',
    valueType: FeatureValueType.NUMERIC,
    sortOrder: 11,
  },
  {
    code: PlanFeatureCode.EDIT_TITLE_ON_REACTIVATE,
    name: 'Modificar el título al reactivar',
    description: 'Permite cambiar el título al reactivar la vacante.',
    valueType: FeatureValueType.BOOLEAN,
    sortOrder: 12,
  },
  {
    code: PlanFeatureCode.PUBLICATION_DAYS,
    name: 'Días de publicación',
    description: 'Vigencia de la publicación promocionada.',
    valueType: FeatureValueType.NUMERIC,
    sortOrder: 13,
  },
];

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(PlanFeature);

  try {
    let created = 0;
    let updated = 0;

    for (const seed of FEATURES) {
      const existing = await repo.findOne({ where: { code: seed.code } });
      if (!existing) {
        await repo.save(repo.create(seed));
        created += 1;
        continue;
      }
      existing.name = seed.name;
      existing.description = seed.description;
      existing.valueType = seed.valueType;
      existing.sortOrder = seed.sortOrder;
      await repo.save(existing);
      updated += 1;
    }

    console.log(
      `Catálogo de beneficios listo: ${created} creados, ${updated} actualizados.`,
    );
    console.log(
      'Los planes (Media/Alta/Anual) NO se siembran: créalos desde POST /admin/plans con sus precios reales.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
