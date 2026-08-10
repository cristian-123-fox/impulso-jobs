import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import { ApplicationStatus } from '@/modules/applications/entities/application-status.entity';
import { ApplicationStatusCode } from '@/modules/applications/enums/application-status.enum';

/**
 * Seed del catálogo `application_status` (M11). Idempotente: inserta lo que
 * falta y actualiza nombre/orden de lo existente, sin tocar los estados que un
 * administrador haya añadido por su cuenta.
 *
 * Ejecutar: `pnpm seed:applications`.
 */

interface StatusSeed {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isFinal: boolean;
}

const STATUSES: readonly StatusSeed[] = [
  {
    code: ApplicationStatusCode.IN_REVIEW,
    name: 'En revisión',
    description: 'La empresa aún no ha revisado la postulación.',
    sortOrder: 1,
    isFinal: false,
  },
  {
    code: ApplicationStatusCode.IN_PROGRESS,
    name: 'En proceso',
    description: 'La postulación avanza dentro del proceso de selección.',
    sortOrder: 2,
    isFinal: false,
  },
  {
    code: ApplicationStatusCode.INTERVIEW,
    name: 'Entrevista',
    description: 'El aspirante fue citado a entrevista.',
    sortOrder: 3,
    isFinal: false,
  },
  {
    code: ApplicationStatusCode.TECHNICAL_TEST,
    name: 'Prueba técnica',
    description: 'El aspirante está en evaluación técnica.',
    sortOrder: 4,
    isFinal: false,
  },
  {
    code: ApplicationStatusCode.SELECTED,
    name: 'Seleccionado',
    description: 'El aspirante fue elegido para el puesto.',
    sortOrder: 5,
    isFinal: true,
  },
  {
    code: ApplicationStatusCode.REJECTED,
    name: 'Rechazado',
    description: 'El aspirante no continúa en el proceso.',
    sortOrder: 6,
    isFinal: true,
  },
  {
    code: ApplicationStatusCode.FINISHED,
    name: 'Finalizado',
    description: 'El proceso se cerró sin continuar con este aspirante.',
    sortOrder: 7,
    isFinal: true,
  },
];

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ApplicationStatus);

  try {
    let created = 0;
    let updated = 0;

    for (const seed of STATUSES) {
      const existing = await repo.findOne({ where: { code: seed.code } });
      if (!existing) {
        await repo.save(repo.create(seed));
        created += 1;
        continue;
      }

      existing.name = seed.name;
      existing.description = seed.description;
      existing.sortOrder = seed.sortOrder;
      existing.isFinal = seed.isFinal;
      await repo.save(existing);
      updated += 1;
    }

    console.log(
      `Catálogo de estados de postulación listo: ${created} creados, ${updated} actualizados.`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
