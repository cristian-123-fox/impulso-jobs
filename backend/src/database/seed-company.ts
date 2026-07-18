import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import { hashPassword } from '@/common/utils/password.util';
import { Role as PlatformRole } from '@/common/types/role.enum';
import { UserStatus } from '@/common/types/user-status.enum';
import { User } from '@/modules/iam/users/entities/user.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyUser } from '@/modules/companies/entities/company-user.entity';
import { CompanyMemberRole } from '@/modules/companies/enums/company-member-role.enum';

/**
 * Seeder de una empresa de prueba. Idempotente: crea o actualiza el usuario
 * (verificado, activo, sin bloqueo), le asigna el rol EMPLOYER en `user_roles`,
 * y garantiza la empresa + su membresía OWNER en `company_users` (necesario para
 * el perfil corporativo M9).
 * Requiere que el rol EMPLOYER exista (ejecuta antes `pnpm seed:rbac`).
 * Ejecutar: `pnpm seed:company`.
 * Sobrescribible con SEED_COMPANY_EMAIL / SEED_COMPANY_PASSWORD.
 */
const COMPANY_EMAIL = process.env.SEED_COMPANY_EMAIL ?? 'empresa@impulso.test';
const COMPANY_PASSWORD = process.env.SEED_COMPANY_PASSWORD ?? 'Empresa123!';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const companyRepo = AppDataSource.getRepository(Company);
  const companyUserRepo = AppDataSource.getRepository(CompanyUser);

  try {
    const email = COMPANY_EMAIL.trim().toLowerCase();
    const passwordHash = await hashPassword(COMPANY_PASSWORD);

    let user = await userRepo.findOne({ where: { email } });
    if (user) {
      user.passwordHash = passwordHash;
      user.role = PlatformRole.EMPLOYER;
      user.status = UserStatus.ACTIVE;
      user.failedAttempts = 0;
      user.blockedUntil = null;
      user.emailVerifiedAt ??= new Date();
      user = await userRepo.save(user);
      console.log(`Empresa (usuario) actualizada: ${email}`);
    } else {
      user = await userRepo.save(
        userRepo.create({
          email,
          passwordHash,
          role: PlatformRole.EMPLOYER,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        }),
      );
      console.log(`Empresa (usuario) creada: ${email}`);
    }

    const employerRole = await roleRepo.findOne({ where: { code: 'EMPLOYER' } });
    if (!employerRole) {
      console.warn(
        '⚠ El rol EMPLOYER no existe. Ejecuta primero: pnpm seed:rbac',
      );
    } else {
      const exists = await userRoleRepo.findOne({
        where: { userId: user.id, roleId: employerRole.id },
      });
      if (exists) {
        console.log('El rol EMPLOYER ya estaba asignado en user_roles.');
      } else {
        await userRoleRepo.save(
          userRoleRepo.create({ userId: user.id, roleId: employerRole.id }),
        );
        console.log('Rol EMPLOYER asignado en user_roles.');
      }
    }

    let membership = await companyUserRepo.findOne({
      where: { userId: user.id },
    });
    if (membership) {
      console.log('El usuario ya tenía empresa asociada (company_users).');
    } else {
      const company = await companyRepo.save(
        companyRepo.create({
          businessName: 'Northwind Corp',
          legalName: 'Northwind Corp S.A. de C.V.',
          rfc: 'NWC160101AB2',
          taxRegime: '601',
          postalCode: '44100',
          country: 'MX',
          state: 'JAL',
          municipality: 'Guadalajara',
        }),
      );
      membership = await companyUserRepo.save(
        companyUserRepo.create({
          companyId: company.id,
          userId: user.id,
          role: CompanyMemberRole.OWNER,
        }),
      );
      console.log('Empresa + membresía OWNER creadas (companies/company_users).');
    }

    console.log(
      `Listo. Inicia sesión con ${email} / ${COMPANY_PASSWORD} (rol EMPLOYER).`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
