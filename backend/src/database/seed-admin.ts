import type { DataSource } from 'typeorm';
import { runSeedScript } from './seed-script';
import { hashPassword } from '@/common/utils/password.util';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';

/**
 * Seeder del usuario administrador. Idempotente: crea o actualiza el usuario
 * (verificado, activo, sin bloqueo) y le asigna el rol ADMIN en `user_roles`.
 * Requiere que el rol ADMIN exista (ejecuta antes `pnpm seed:rbac`).
 * Ejecutar: `pnpm seed` (todas) o `pnpm seed:admin` (sólo esta).
 * Sobrescribible con SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'oscarruiz2614@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123';

export async function seedAdmin(dataSource: DataSource): Promise<string> {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  let user = await userRepo.findOne({ where: { email } });
  if (user) {
    user.passwordHash = passwordHash;
    user.role = PlatformRole.ADMIN;
    user.status = UserStatus.ACTIVE;
    user.failedAttempts = 0;
    user.blockedUntil = null;
    user.emailVerifiedAt ??= new Date();
    user = await userRepo.save(user);
    console.log(`Administrador actualizado: ${email}`);
  } else {
    user = await userRepo.save(
      userRepo.create({
        email,
        passwordHash,
        role: PlatformRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    console.log(`Administrador creado: ${email}`);
  }

  const adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
  if (!adminRole) {
    console.warn('⚠ El rol ADMIN no existe. Ejecuta primero: pnpm seed:rbac');
  } else {
    const exists = await userRoleRepo.findOne({
      where: { userId: user.id, roleId: adminRole.id },
    });
    if (exists) {
      console.log('El rol ADMIN ya estaba asignado en user_roles.');
    } else {
      await userRoleRepo.save(
        userRoleRepo.create({ userId: user.id, roleId: adminRole.id }),
      );
      console.log('Rol ADMIN asignado en user_roles.');
    }
  }

  return `Administrador · inicia sesión con ${email}.`;
}

// Entrypoint del comando individual. Con `pnpm seed` lo llama el orquestador.
if (require.main === module) {
  void runSeedScript(seedAdmin);
}
