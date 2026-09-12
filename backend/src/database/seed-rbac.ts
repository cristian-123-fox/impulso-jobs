import type { DataSource } from 'typeorm';
import { runSeedScript } from './seed-script';
import { Role } from '@/modules/iam/roles/entities/role.entity';
import { Component } from '@/modules/iam/permissions/entities/component.entity';
import { Action } from '@/modules/iam/permissions/entities/action.entity';
import { Permission } from '@/modules/iam/permissions/entities/permission.entity';
import { RolePermission } from '@/modules/iam/permissions/entities/role-permission.entity';
import { UserRole } from '@/modules/iam/users/entities/user-role.entity';
import { User } from '@/modules/iam/users/entities/user.entity';

/**
 * Seed RBAC (M2) según la matriz de permisos (Sección 2 del documento de roles).
 *
 * Idempotente y **actualizador**: inserta lo que falta y refresca las etiquetas
 * (nombre de componente/acción, descripción del permiso, nombre del rol) de lo
 * que ya existe. Además retro-llena `user_roles` a partir de `users.role`.
 *
 * Lo que **no** hace: retirar permisos. Quitar un código de `MATRIX` no borra la
 * fila de `role_permissions` — hacerlo en ciego arrasaría también los permisos
 * que un administrador haya concedido a mano desde `/admin/roles`. Para revocar,
 * quítalo desde el back-office o con una migración de datos.
 *
 * Ejecutar: `pnpm seed:rbac` (o `pnpm seed`, que lo corre junto a los demás).
 *
 * ⚠️ La app cachea el mapa rol→permisos en memoria (`PermissionsService`), así
 * que tras sembrar en un servidor **hay que reiniciar el proceso** o los
 * permisos nuevos siguen dando 403.
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
  saved_vacancies: 'Vacantes guardadas',
  settings: 'Configuración',
  plans: 'Planes',
  promotions: 'Promociones',
  subscriptions: 'Suscripciones',
  account: 'Cuenta',
  notifications: 'Notificaciones',
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
  data_export: 'Exportar datos',
  status: 'Cambiar estado',
  checkout: 'Pagar',
  search: 'Buscar',
};

/** Todos los permisos `component.action` de la matriz. */
const PERMISSION_CODES: readonly string[] = [
  'users.read',
  'users.create',
  'users.update',
  'users.block',
  'users.delete',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'roles.assign',
  'permissions.assign',
  'catalogs.read',
  'catalogs.manage',
  'audit.read',
  'companies.read',
  'companies.create',
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
  'saved_vacancies.manage',
  'settings.read',
  'settings.update',
  'plans.read',
  'plans.manage',
  'promotions.create',
  'promotions.checkout',
  'promotions.read',
  'subscriptions.create',
  'subscriptions.manage',
  'subscriptions.read',
  'account.delete',
  'account.data_export',
  'notifications.read',
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
    'users.create',
    'users.update',
    'users.block',
    'users.delete',
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.delete',
    'roles.assign',
    'permissions.assign',
    'catalogs.read',
    'catalogs.manage',
    'audit.read',
    'companies.read',
    'companies.create',
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
    'subscriptions.read',
    'account.delete',
    'account.data_export',
    'notifications.read',
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
    'subscriptions.create',
    'subscriptions.manage',
    'subscriptions.read',
    'account.delete',
    'account.data_export',
    'notifications.read',
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
    'saved_vacancies.manage',
    'settings.read',
    'settings.update',
    'plans.read',
    'account.delete',
    'account.data_export',
    'notifications.read',
  ],
};

function splitCode(code: string): { component: string; action: string } {
  const idx = code.indexOf('.');
  return { component: code.slice(0, idx), action: code.slice(idx + 1) };
}

export async function seedRbac(dataSource: DataSource): Promise<string> {
  const componentRepo = dataSource.getRepository(Component);
  const actionRepo = dataSource.getRepository(Action);
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const rolePermissionRepo = dataSource.getRepository(RolePermission);
  const userRepo = dataSource.getRepository(User);
  const userRoleRepo = dataSource.getRepository(UserRole);

  const componentIds = new Map<string, string>();
  const actionIds = new Map<string, string>();

  // Components + actions (derivados de los códigos). Se refresca la etiqueta:
  // renombrar un componente en la fuente debe verse en la matriz de /admin/roles.
  for (const code of PERMISSION_CODES) {
    const { component, action } = splitCode(code);
    if (!componentIds.has(component)) {
      const name = COMPONENT_NAMES[component] ?? component;
      let row = await componentRepo.findOne({ where: { code: component } });
      if (!row) {
        row = await componentRepo.save(
          componentRepo.create({ code: component, name }),
        );
      } else if (row.name !== name) {
        row.name = name;
        row = await componentRepo.save(row);
      }
      componentIds.set(component, row.id);
    }
    if (!actionIds.has(action)) {
      const name = ACTION_NAMES[action] ?? action;
      let row = await actionRepo.findOne({ where: { code: action } });
      if (!row) {
        row = await actionRepo.save(actionRepo.create({ code: action, name }));
      } else if (row.name !== name) {
        row.name = name;
        row = await actionRepo.save(row);
      }
      actionIds.set(action, row.id);
    }
  }

  // Permissions.
  const permissionIds = new Map<string, string>();
  for (const code of PERMISSION_CODES) {
    const { component, action } = splitCode(code);
    const componentId = componentIds.get(component)!;
    const actionId = actionIds.get(action)!;
    const description = `${ACTION_NAMES[action] ?? action} · ${COMPONENT_NAMES[component] ?? component}`;

    let row = await permissionRepo.findOne({ where: { code } });
    if (!row) {
      row = await permissionRepo.save(
        permissionRepo.create({ code, componentId, actionId, description }),
      );
    } else if (
      row.componentId !== componentId ||
      row.actionId !== actionId ||
      row.description !== description
    ) {
      row.componentId = componentId;
      row.actionId = actionId;
      row.description = description;
      row = await permissionRepo.save(row);
    }
    permissionIds.set(code, row.id);
  }

  // Roles base. `isSystem` se reafirma: un rol base no debe quedar borrable
  // porque alguien lo desmarcara desde el back-office.
  const roleIds = new Map<string, string>();
  for (const [code, meta] of Object.entries(ROLE_META)) {
    let row = await roleRepo.findOne({ where: { code } });
    if (!row) {
      row = await roleRepo.save(
        roleRepo.create({
          code,
          name: meta.name,
          description: meta.description,
          isSystem: true,
        }),
      );
    } else if (
      row.name !== meta.name ||
      row.description !== meta.description ||
      !row.isSystem
    ) {
      row.name = meta.name;
      row.description = meta.description;
      row.isSystem = true;
      row = await roleRepo.save(row);
    }
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
      await userRoleRepo.save(userRoleRepo.create({ userId: user.id, roleId }));
      backfilled++;
    }
  }

  return (
    `RBAC · componentes:${componentIds.size} acciones:${actionIds.size} ` +
    `permisos:${permissionIds.size} roles:${roleIds.size} ` +
    `role_permissions+${assigned} user_roles+${backfilled}`
  );
}

// Entrypoint del comando individual. Con `pnpm seed` lo llama el orquestador.
if (require.main === module) {
  void runSeedScript(seedRbac);
}
