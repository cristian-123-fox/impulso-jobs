import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { Component } from '@/modules/iam/permissions/entities/component.entity';
import { Action } from '@/modules/iam/permissions/entities/action.entity';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { RolePermission } from '@/modules/iam/permissions/entities/role-permission.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { User } from '@/modules/iam/users/entities/user.entity';

/**
 * Seed RBAC (M2) según la matriz de permisos (Sección 2 del documento de roles).
 * Idempotente: sólo inserta lo que falta. Además retro-llena `user_roles` a
 * partir de `users.role`. Ejecutar: `pnpm seed:rbac`.
 */

const COMPONENT_NAMES: Record<string, string> = {
  users: 'Usuarios',
  roles: 'Roles',
  permissions: 'Permisos',
  catalogs: 'Catálogos',
  audit: 'Auditoría',
  companies: 'Empresas',
  company_users: 'Usuarios de empresa',
  vacancies: 'Vacantes',
  applications: 'Postulaciones',
  candidates: 'Candidatos',
  candidate_profile: 'Perfil del candidato',
  experiences: 'Experiencia',
  educations: 'Educación',
  languages: 'Idiomas',
  skills: 'Habilidades',
  resumes: 'Hojas de vida',
  settings: 'Configuración',
  plans: 'Planes',
  promotions: 'Promociones',
  account: 'Cuenta',
};

const ACTION_NAMES: Record<string, string> = {
  read: 'Leer',
  update: 'Actualizar',
  block: 'Bloquear',
  delete: 'Eliminar',
  create: 'Crear',
  assign: 'Asignar',
  manage: 'Administrar',
  'read.public': 'Leer (público)',
  'status.update': 'Actualizar estado',
  'cv.read': 'Leer hoja de vida',
  status: 'Cambiar estado',
  checkout: 'Pagar',
  search: 'Buscar',
};

/** Todos los permisos `component.action` de la matriz. */
const PERMISSION_CODES: readonly string[] = [
  'users.read',
  'users.update',
  'users.block',
  'users.delete',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.assign',
  'permissions.assign',
  'catalogs.read',
  'catalogs.manage',
  'audit.read',
  'companies.read',
  'companies.update',
  'company_users.manage',
  'vacancies.read',
  'vacancies.read.public',
  'vacancies.create',
  'vacancies.update',
  'vacancies.status',
  'applications.create',
  'applications.read',
  'applications.status.update',
  'candidates.search',
  'candidates.cv.read',
  'candidate_profile.read',
  'candidate_profile.update',
  'experiences.manage',
  'educations.manage',
  'languages.manage',
  'skills.manage',
  'resumes.manage',
  'settings.read',
  'settings.update',
  'plans.read',
  'plans.manage',
  'promotions.create',
  'promotions.checkout',
  'promotions.read',
  'account.delete',
];

const ROLE_META: Record<string, { name: string; description: string }> = {
  ADMIN: {
    name: 'Administrador',
    description: 'Gobierna y configura la plataforma.',
  },
  EMPLOYER: {
    name: 'Empresa / Reclutador',
    description: 'Gestiona su empresa y sus procesos.',
  },
  CANDIDATE: {
    name: 'Aspirante',
    description: 'Gestiona su perfil y sus postulaciones.',
  },
};

const MATRIX: Record<string, readonly string[]> = {
  ADMIN: [
    'users.read',
    'users.update',
    'users.block',
    'users.delete',
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.assign',
    'permissions.assign',
    'catalogs.read',
    'catalogs.manage',
    'audit.read',
    'companies.read',
    'companies.update',
    'company_users.manage',
    'vacancies.read',
    'vacancies.read.public',
    'vacancies.create',
    'vacancies.update',
    'vacancies.status',
    'applications.read',
    'applications.status.update',
    'candidates.search',
    'candidates.cv.read',
    'candidate_profile.read',
    'candidate_profile.update',
    'plans.read',
    'plans.manage',
    'promotions.read',
    'account.delete',
  ],
  EMPLOYER: [
    'catalogs.read',
    'companies.read',
    'companies.update',
    'company_users.manage',
    'vacancies.read',
    'vacancies.read.public',
    'vacancies.create',
    'vacancies.update',
    'vacancies.status',
    'applications.read',
    'applications.status.update',
    'candidates.search',
    'candidates.cv.read',
    'plans.read',
    'promotions.create',
    'promotions.checkout',
    'promotions.read',
    'account.delete',
  ],
  CANDIDATE: [
    'catalogs.read',
    'vacancies.read.public',
    'applications.create',
    'applications.read',
    'candidate_profile.read',
    'candidate_profile.update',
    'experiences.manage',
    'educations.manage',
    'languages.manage',
    'skills.manage',
    'resumes.manage',
    'settings.read',
    'settings.update',
    'plans.read',
    'account.delete',
  ],
};

function splitCode(code: string): { component: string; action: string } {
  const idx = code.indexOf('.');
  return { component: code.slice(0, idx), action: code.slice(idx + 1) };
}

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const componentRepo = AppDataSource.getRepository(Component);
  const actionRepo = AppDataSource.getRepository(Action);
  const permissionRepo = AppDataSource.getRepository(Permission);
  const roleRepo = AppDataSource.getRepository(Role);
  const rolePermissionRepo = AppDataSource.getRepository(RolePermission);
  const userRepo = AppDataSource.getRepository(User);
  const userRoleRepo = AppDataSource.getRepository(UserRole);

  try {
    const componentIds = new Map<string, string>();
    const actionIds = new Map<string, string>();

    // Components + actions (derivados de los códigos).
    for (const code of PERMISSION_CODES) {
      const { component, action } = splitCode(code);
      if (!componentIds.has(component)) {
        let row = await componentRepo.findOne({ where: { code: component } });
        row ??= await componentRepo.save(
          componentRepo.create({
            code: component,
            name: COMPONENT_NAMES[component] ?? component,
          }),
        );
        componentIds.set(component, row.id);
      }
      if (!actionIds.has(action)) {
        let row = await actionRepo.findOne({ where: { code: action } });
        row ??= await actionRepo.save(
          actionRepo.create({
            code: action,
            name: ACTION_NAMES[action] ?? action,
          }),
        );
        actionIds.set(action, row.id);
      }
    }

    // Permissions.
    const permissionIds = new Map<string, string>();
    for (const code of PERMISSION_CODES) {
      const { component, action } = splitCode(code);
      let row = await permissionRepo.findOne({ where: { code } });
      row ??= await permissionRepo.save(
        permissionRepo.create({
          code,
          componentId: componentIds.get(component)!,
          actionId: actionIds.get(action)!,
          description: `${ACTION_NAMES[action] ?? action} · ${COMPONENT_NAMES[component] ?? component}`,
        }),
      );
      permissionIds.set(code, row.id);
    }

    // Roles base.
    const roleIds = new Map<string, string>();
    for (const [code, meta] of Object.entries(ROLE_META)) {
      let row = await roleRepo.findOne({ where: { code } });
      row ??= await roleRepo.save(
        roleRepo.create({
          code,
          name: meta.name,
          description: meta.description,
          isSystem: true,
        }),
      );
      roleIds.set(code, row.id);
    }

    // role_permissions según la matriz.
    let assigned = 0;
    for (const [roleCode, codes] of Object.entries(MATRIX)) {
      const roleId = roleIds.get(roleCode)!;
      for (const code of codes) {
        const permissionId = permissionIds.get(code)!;
        const exists = await rolePermissionRepo.findOne({
          where: { roleId, permissionId },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({ roleId, permissionId }),
          );
          assigned++;
        }
      }
    }

    // Backfill user_roles desde users.role.
    let backfilled = 0;
    const users = await userRepo.find();
    for (const user of users) {
      const roleId = roleIds.get(user.role);
      if (!roleId) continue;
      const exists = await userRoleRepo.findOne({
        where: { userId: user.id, roleId },
      });
      if (!exists) {
        await userRoleRepo.save(
          userRoleRepo.create({ userId: user.id, roleId }),
        );
        backfilled++;
      }
    }

    console.log(
      `Seed RBAC OK · componentes:${componentIds.size} acciones:${actionIds.size} ` +
        `permisos:${permissionIds.size} roles:${roleIds.size} role_permissions+${assigned} user_roles+${backfilled}`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
