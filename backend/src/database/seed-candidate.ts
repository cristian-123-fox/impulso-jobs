import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import { hashPassword } from '@/common/utils/password.util';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { DocumentType } from '@/modules/candidates/enums/document-type.enum';

/**
 * Seeder de un candidato de prueba. Idempotente: crea o actualiza el usuario
 * (verificado, activo, sin bloqueo), le asigna el rol CANDIDATE en `user_roles`
 * y garantiza su `candidate_profile` (necesario para el panel del candidato,
 * perfil, hojas de vida y configuración M8).
 * Requiere que el rol CANDIDATE exista (ejecuta antes `pnpm seed:rbac`).
 * Ejecutar: `pnpm seed:candidate`.
 * Sobrescribible con SEED_CANDIDATE_EMAIL / SEED_CANDIDATE_PASSWORD.
 */
const CANDIDATE_EMAIL =
  process.env.SEED_CANDIDATE_EMAIL ?? 'candidato@impulso.test';
const CANDIDATE_PASSWORD =
  process.env.SEED_CANDIDATE_PASSWORD ?? 'Candidato123!';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const profileRepo = AppDataSource.getRepository(CandidateProfile);

  try {
    const email = CANDIDATE_EMAIL.trim().toLowerCase();
    const passwordHash = await hashPassword(CANDIDATE_PASSWORD);

    let user = await userRepo.findOne({ where: { email } });
    if (user) {
      user.passwordHash = passwordHash;
      user.role = PlatformRole.CANDIDATE;
      user.status = UserStatus.ACTIVE;
      user.failedAttempts = 0;
      user.blockedUntil = null;
      user.emailVerifiedAt ??= new Date();
      user = await userRepo.save(user);
      console.log(`Candidato actualizado: ${email}`);
    } else {
      user = await userRepo.save(
        userRepo.create({
          email,
          passwordHash,
          role: PlatformRole.CANDIDATE,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        }),
      );
      console.log(`Candidato creado: ${email}`);
    }

    const candidateRole = await roleRepo.findOne({
      where: { code: 'CANDIDATE' },
    });
    if (!candidateRole) {
      console.warn(
        '⚠ El rol CANDIDATE no existe. Ejecuta primero: pnpm seed:rbac',
      );
    } else {
      const exists = await userRoleRepo.findOne({
        where: { userId: user.id, roleId: candidateRole.id },
      });
      if (exists) {
        console.log('El rol CANDIDATE ya estaba asignado en user_roles.');
      } else {
        await userRoleRepo.save(
          userRoleRepo.create({ userId: user.id, roleId: candidateRole.id }),
        );
        console.log('Rol CANDIDATE asignado en user_roles.');
      }
    }

    let profile = await profileRepo.findOne({ where: { userId: user.id } });
    if (profile) {
      console.log('El candidato ya tenía perfil (candidate_profile).');
    } else {
      profile = await profileRepo.save(
        profileRepo.create({
          userId: user.id,
          firstName: 'María',
          lastName: 'Ferreira',
          documentType: DocumentType.CURP,
          documentNumber: 'SEED-CANDIDATE-0001',
          birthDate: '1995-05-20',
          professionalTitle: 'Frontend Engineer',
          country: 'MX',
          state: 'CMX',
          municipality: 'Cuauhtémoc',
        }),
      );
      console.log('Perfil de candidato creado (candidate_profile).');
    }

    console.log(
      `Listo. Inicia sesión con ${email} / ${CANDIDATE_PASSWORD} (rol CANDIDATE).`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
