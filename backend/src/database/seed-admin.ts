import type { DataSource } from 'typeorm';
import { hashPassword } from '@/common/utils/password.util';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { seedAccountConsents } from './seed-consents';

/**
 * Seeder del usuario administrador. Idempotente: crea o actualiza el usuario
 * (verificado, activo, sin bloqueo) y le asigna el rol ADMIN en `user_roles`.
 * Requiere que el rol ADMIN exista; `pnpm seed` siembra el RBAC antes.
 * Ejecutar: `pnpm seed` (todas) o `pnpm seed -- --only=admin`.
 * Sobrescribible con SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'oscarruiz2614@gmail.com';

/**
 * `Admin123` sólo se usa para **crear** el administrador en desarrollo.
 *
 * En producción, crear el admin exige `SEED_ADMIN_PASSWORD`; y una cuenta que
 * ya existe **nunca** cambia de contraseña salvo con
 * `SEED_ADMIN_RESET_PASSWORD=true`.
 *
 * Antes, `pnpm seed:prod` sin variables dejaba al administrador con `Admin123`
 * en cada despliegue. Ese era el riesgo P0 de la revisión de permisos.
 */
const DEFAULT_ADMIN_PASSWORD = 'Admin123';
const isProduction = process.env.NODE_ENV === 'production';

function explicitAdminPassword(): string | undefined {
  const value = process.env.SEED_ADMIN_PASSWORD?.trim();
  return value ? value : undefined;
}

function resetRequested(): boolean {
  return process.env.SEED_ADMIN_RESET_PASSWORD === 'true';
}

export async function seedAdmin(dataSource: DataSource): Promise<string> {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const newPassword = explicitAdminPassword();

  let user = await userRepo.findOne({ where: { email } });
  if (user) {
    if (resetRequested()) {
      if (!newPassword) {
        throw new Error(
          'SEED_ADMIN_RESET_PASSWORD=true exige SEED_ADMIN_PASSWORD con la contraseña nueva.',
        );
      }
      user.passwordHash = await hashPassword(newPassword);
      console.log('Contraseña del administrador restablecida explícitamente.');
    } else {
      console.log(
        'Administrador existente: se conserva la contraseña (usa SEED_ADMIN_RESET_PASSWORD=true para cambiarla).',
      );
    }
    user.role = PlatformRole.ADMIN;
    user.status = UserStatus.ACTIVE;
    user.failedAttempts = 0;
    user.blockedUntil = null;
    user.emailVerifiedAt ??= new Date();
    user = await userRepo.save(user);
    console.log(`Administrador actualizado: ${email}`);
  } else {
    if (isProduction && !newPassword) {
      throw new Error(
        'Crear el administrador en producción exige SEED_ADMIN_PASSWORD. No se usa Admin123.',
      );
    }
    const initialPassword = newPassword ?? DEFAULT_ADMIN_PASSWORD;
    user = await userRepo.save(
      userRepo.create({
        email,
        passwordHash: await hashPassword(initialPassword),
        role: PlatformRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    if (!newPassword) {
      console.warn(
        '⚠ Administrador creado con la contraseña por defecto: cámbiala antes de abrir al público.',
      );
    }
    console.log(`Administrador creado: ${email}`);
  }

  const adminRole = await roleRepo.findOne({ where: { code: 'ADMIN' } });
  if (!adminRole) {
    console.warn(
      '⚠ El rol ADMIN no existe. Ejecuta primero: pnpm seed -- --only=rbac',
    );
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

  const consents = await seedAccountConsents(dataSource, user);
  console.log(
    `Consentimientos legales registrados: ${consents} (si ya estaban, 0).`,
  );

  return `Administrador · inicia sesión con ${email}.`;
}
