import 'reflect-metadata';
import { LessThan } from 'typeorm';
import { AppDataSource } from './typeorm.config';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { User } from '@/modules/iam/users/entities/user.entity';

/**
 * Purga física de las cuentas dadas de baja que ya superaron el periodo de
 * retención (M13 / LFPDPPP).
 *
 * **Es destructivo e irreversible.** Por eso:
 * - Se ejecuta en **simulación por defecto**: sólo lista lo que borraría.
 * - Sólo borra de verdad con el argumento explícito `--confirm`.
 *
 * Retención: `ACCOUNT_RETENTION_DAYS` (por defecto 90 días desde la baja).
 *
 *   pnpm purge:accounts              # simulación
 *   pnpm purge:accounts -- --confirm # purga real
 *
 * Se conservan `candidate_applications`, `vacancies` y `audit_logs`: son
 * registro histórico de la contraparte. Al desaparecer el perfil, esas filas
 * quedan anonimizadas de hecho, porque ya no resuelven a ninguna persona.
 */

const DEFAULT_RETENTION_DAYS = 90;

function retentionDays(): number {
  const raw = process.env.ACCOUNT_RETENTION_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_RETENTION_DAYS;
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes('--confirm');
  const days = retentionDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);

  try {
    // Sólo las dadas de baja antes del corte; se filtra en SQL, no en memoria.
    const target = await users.find({
      where: { deletedAt: LessThan(cutoff) },
      withDeleted: true,
      order: { deletedAt: 'ASC' },
    });

    console.log(
      `Retención: ${days} días · corte: ${cutoff.toISOString()} · cuentas elegibles: ${target.length}`,
    );
    for (const user of target) {
      console.log(
        `  - ${user.email} (baja el ${user.deletedAt?.toISOString() ?? '?'})`,
      );
    }

    if (target.length === 0) {
      console.log('Nada que purgar.');
      return;
    }

    if (!confirmed) {
      console.log(
        '\nSIMULACIÓN: no se borró nada. Repite con `--confirm` para purgar de verdad.',
      );
      return;
    }

    for (const user of target) {
      await AppDataSource.transaction(async (manager) => {
        await manager
          .getRepository(CandidateProfile)
          .delete({ userId: user.id });
        await manager.getRepository(User).delete({ id: user.id });
      });
      console.log(`  purgado: ${user.email}`);
    }
    console.log(`\n${target.length} cuenta(s) purgada(s) definitivamente.`);
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
