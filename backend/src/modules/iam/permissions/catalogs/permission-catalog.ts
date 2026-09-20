import { RoleScope } from '@/common/types/role-scope.enum';

/**
 * Catálogo de presentación de los permisos: cómo se agrupan, cómo se llaman en
 * castellano y a qué ámbito de rol pertenecen.
 *
 * Vive en el backend y **viaja en `GET /permissions`** en vez de duplicarse en
 * `frontend/shared/catalogs/`: los permisos ya vienen de la BD con su id, así
 * que la única forma de que la etiqueta y el grupo no se desincronicen del
 * código es que salgan de la misma respuesta.
 *
 * Tres cosas que define, y por qué importan:
 *
 * 1. **`group`** — el árbol de `/admin/roles/:id` se dibuja con esto. Un
 *    permiso sin entrada en el catálogo no desaparece: cae en el grupo `other`
 *    con su código como etiqueta, para que añadir un permiso y olvidarse de
 *    documentarlo no lo vuelva inasignable.
 * 2. **`scopes`** — a qué ámbitos se les puede ofrecer. Un rol de empresa no
 *    tiene por qué ver `users.delete` en su árbol.
 * 3. **`SCOPE_BASELINE`** — lo que **siempre** se concede, sin fila en
 *    `role_permissions`. Resuelve dos problemas reales: un rol personalizado
 *    recién creado no nacía pudiendo ni leer catálogos ni ver sus avisos, y el
 *    aspirante dependía de que alguien recordara correr `pnpm seed`.
 */

export interface PermissionMeta {
  /** Clave del grupo en `PERMISSION_GROUPS`. */
  group: string;
  /** Etiqueta corta en castellano (la que ve el administrador). */
  label: string;
  /** Qué implica conceder el permiso, en una frase. */
  description: string;
  /** Ámbitos de rol a los que se les puede ofrecer. */
  scopes: readonly RoleScope[];
}

export interface PermissionGroupMeta {
  key: string;
  label: string;
  description: string;
  /** Nombre de icono del kit `ij-icon` (el frontend lo pinta tal cual). */
  icon: string;
  /** Orden de aparición en el árbol. */
  order: number;
}

const ALL_SCOPES: readonly RoleScope[] = [
  RoleScope.PLATFORM,
  RoleScope.COMPANY,
  RoleScope.CANDIDATE,
];
const BACK_OFFICE: readonly RoleScope[] = [RoleScope.PLATFORM];
const BACK_OFFICE_AND_COMPANY: readonly RoleScope[] = [
  RoleScope.PLATFORM,
  RoleScope.COMPANY,
];
const COMPANY_ONLY: readonly RoleScope[] = [RoleScope.COMPANY];
const CANDIDATE_ONLY: readonly RoleScope[] = [RoleScope.CANDIDATE];

export const PERMISSION_GROUPS: readonly PermissionGroupMeta[] = [
  {
    key: 'users',
    label: 'Usuarios y cuentas',
    description: 'Altas, bloqueos y bajas de cuentas de la plataforma.',
    icon: 'users',
    order: 1,
  },
  {
    key: 'access',
    label: 'Roles y permisos',
    description: 'Quién puede hacer qué. Cambiarlo afecta a todo el sistema.',
    icon: 'shield',
    order: 2,
  },
  {
    key: 'companies',
    label: 'Empresas',
    description: 'Ficha de la empresa y su equipo de trabajo.',
    icon: 'building',
    order: 3,
  },
  {
    key: 'vacancies',
    label: 'Vacantes',
    description: 'Publicación y ciclo de vida de las ofertas de empleo.',
    icon: 'briefcase',
    order: 4,
  },
  {
    key: 'applications',
    label: 'Postulaciones',
    description: 'Candidaturas recibidas y su avance por el proceso.',
    icon: 'clipboard',
    order: 5,
  },
  {
    key: 'talent',
    label: 'Base de talento',
    description: 'Búsqueda de aspirantes y consulta de sus hojas de vida.',
    icon: 'search',
    order: 6,
  },
  {
    key: 'billing',
    label: 'Planes y cobros',
    description: 'Suscripciones, promociones y catálogo de planes.',
    icon: 'credit-card',
    order: 7,
  },
  {
    key: 'platform',
    label: 'Plataforma',
    description: 'Catálogos internos y bitácora de auditoría.',
    icon: 'settings',
    order: 8,
  },
  {
    key: 'candidate',
    label: 'Perfil del aspirante',
    description: 'Datos que el propio aspirante mantiene sobre sí mismo.',
    icon: 'user',
    order: 9,
  },
  {
    key: 'account',
    label: 'Cuenta propia',
    description: 'Lo que cualquier titular hace sobre su propia cuenta.',
    icon: 'settings',
    order: 10,
  },
  {
    key: 'other',
    label: 'Sin clasificar',
    description:
      'Permisos que existen en la base de datos pero no están en el catálogo.',
    icon: 'tag',
    order: 99,
  },
];

/** Grupo de respaldo para un permiso que no está en `PERMISSION_CATALOG`. */
export const FALLBACK_GROUP = 'other';

export const PERMISSION_CATALOG: Readonly<Record<string, PermissionMeta>> = {
  // ── Usuarios y cuentas ────────────────────────────────────────────────
  'users.read': {
    group: 'users',
    label: 'Ver usuarios',
    description: 'Listar cuentas y abrir su ficha.',
    scopes: BACK_OFFICE,
  },
  'users.create': {
    group: 'users',
    label: 'Crear usuarios',
    description: 'Dar de alta cuentas desde el back-office.',
    scopes: BACK_OFFICE,
  },
  'users.update': {
    group: 'users',
    label: 'Editar usuarios',
    description: 'Cambiar datos de identidad y estado de una cuenta.',
    scopes: BACK_OFFICE,
  },
  'users.block': {
    group: 'users',
    label: 'Bloquear usuarios',
    description: 'Impedir el acceso de una cuenta sin eliminarla.',
    scopes: BACK_OFFICE,
  },
  'users.delete': {
    group: 'users',
    label: 'Eliminar usuarios',
    description: 'Baja de la cuenta (borrado lógico, con purga posterior).',
    scopes: BACK_OFFICE,
  },

  // ── Roles y permisos ──────────────────────────────────────────────────
  'roles.read': {
    group: 'access',
    label: 'Ver roles',
    description: 'Consultar los roles y los permisos que otorgan.',
    scopes: BACK_OFFICE,
  },
  'roles.create': {
    group: 'access',
    label: 'Crear roles',
    description: 'Añadir roles personalizados.',
    scopes: BACK_OFFICE,
  },
  'roles.update': {
    group: 'access',
    label: 'Editar roles',
    description: 'Cambiar nombre y descripción de un rol.',
    scopes: BACK_OFFICE,
  },
  'roles.delete': {
    group: 'access',
    label: 'Eliminar roles',
    description: 'Borrar roles personalizados sin cuentas asignadas.',
    scopes: BACK_OFFICE,
  },
  'roles.assign': {
    group: 'access',
    label: 'Asignar roles a cuentas',
    description: 'Dar o quitar roles adicionales a un usuario.',
    scopes: BACK_OFFICE,
  },
  'permissions.assign': {
    group: 'access',
    label: 'Asignar permisos a roles',
    description: 'Editar la matriz de permisos de cualquier rol.',
    scopes: BACK_OFFICE,
  },

  // ── Empresas ──────────────────────────────────────────────────────────
  'companies.read': {
    group: 'companies',
    label: 'Ver empresas',
    description: 'Consultar la ficha fiscal y comercial de la empresa.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'companies.create': {
    group: 'companies',
    label: 'Crear empresas',
    description: 'Dar de alta una empresa desde el back-office.',
    scopes: BACK_OFFICE,
  },
  'companies.update': {
    group: 'companies',
    label: 'Editar empresa',
    description: 'Modificar datos, logotipo y datos de facturación.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'company_users.manage': {
    group: 'companies',
    label: 'Administrar el equipo',
    description: 'Invitar, editar y quitar personas del equipo de la empresa.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },

  // ── Vacantes ──────────────────────────────────────────────────────────
  'vacancies.read': {
    group: 'vacancies',
    label: 'Ver vacantes',
    description: 'Consultar las vacantes y sus métricas.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'vacancies.read.public': {
    group: 'vacancies',
    label: 'Ver el portal público',
    description: 'Consultar las vacantes publicadas en el portal.',
    scopes: ALL_SCOPES,
  },
  'vacancies.create': {
    group: 'vacancies',
    label: 'Crear vacantes',
    description: 'Publicar nuevas ofertas de empleo.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'vacancies.update': {
    group: 'vacancies',
    label: 'Editar vacantes',
    description: 'Modificar el contenido de una vacante existente.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'vacancies.status': {
    group: 'vacancies',
    label: 'Cambiar estado',
    description: 'Publicar, pausar, cerrar o reabrir una vacante.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },

  // ── Postulaciones ─────────────────────────────────────────────────────
  'applications.create': {
    group: 'applications',
    label: 'Postularse',
    description: 'Enviar una candidatura a una vacante.',
    scopes: CANDIDATE_ONLY,
  },
  'applications.read': {
    group: 'applications',
    label: 'Ver postulaciones',
    description: 'Consultar candidaturas y el detalle de cada una.',
    scopes: ALL_SCOPES,
  },
  'applications.status.update': {
    group: 'applications',
    label: 'Mover de etapa',
    description: 'Cambiar el estado de una candidatura en el proceso.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },

  // ── Base de talento ───────────────────────────────────────────────────
  'candidates.search': {
    group: 'talent',
    label: 'Buscar aspirantes',
    description: 'Explorar la base de talento y abrir un perfil.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'candidates.cv.read': {
    group: 'talent',
    label: 'Ver hojas de vida',
    description: 'Abrir y descargar el CV de un aspirante.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'candidate_profile.read': {
    group: 'talent',
    label: 'Ver perfil profesional',
    description: 'Consultar los datos del perfil de un aspirante.',
    scopes: [RoleScope.PLATFORM, RoleScope.CANDIDATE],
  },
  'candidate_profile.update': {
    group: 'talent',
    label: 'Editar perfil profesional',
    description: 'Modificar los datos del perfil de un aspirante.',
    scopes: [RoleScope.PLATFORM, RoleScope.CANDIDATE],
  },

  // ── Planes y cobros ───────────────────────────────────────────────────
  'plans.read': {
    group: 'billing',
    label: 'Ver planes',
    description: 'Consultar el catálogo de planes y sus beneficios.',
    scopes: ALL_SCOPES,
  },
  'plans.manage': {
    group: 'billing',
    label: 'Administrar planes',
    description: 'Crear y editar planes, precios y suscripciones de empresas.',
    scopes: BACK_OFFICE,
  },
  'promotions.read': {
    group: 'billing',
    label: 'Ver promociones',
    description: 'Consultar las promociones contratadas de una vacante.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'promotions.create': {
    group: 'billing',
    label: 'Contratar promociones',
    description: 'Destacar o impulsar una vacante.',
    scopes: COMPANY_ONLY,
  },
  'promotions.checkout': {
    group: 'billing',
    label: 'Pagar promociones',
    description: 'Abrir el cobro de una promoción.',
    scopes: COMPANY_ONLY,
  },
  'subscriptions.read': {
    group: 'billing',
    label: 'Ver suscripción',
    description: 'Consultar el plan vigente y su vigencia.',
    scopes: BACK_OFFICE_AND_COMPANY,
  },
  'subscriptions.create': {
    group: 'billing',
    label: 'Contratar plan',
    description: 'Suscribir a la empresa a un plan.',
    scopes: COMPANY_ONLY,
  },
  'subscriptions.manage': {
    group: 'billing',
    label: 'Administrar suscripción',
    description: 'Renovar o cancelar el plan de la empresa.',
    scopes: COMPANY_ONLY,
  },

  // ── Plataforma ────────────────────────────────────────────────────────
  'catalogs.read': {
    group: 'platform',
    label: 'Leer catálogos',
    description: 'Estados, áreas profesionales, países y demás listas.',
    scopes: ALL_SCOPES,
  },
  'catalogs.manage': {
    group: 'platform',
    label: 'Administrar catálogos',
    description: 'Editar las listas internas de la plataforma.',
    scopes: BACK_OFFICE,
  },
  'audit.read': {
    group: 'platform',
    label: 'Ver auditoría',
    description: 'Consultar la bitácora de acciones del sistema.',
    scopes: BACK_OFFICE,
  },

  // ── Perfil del aspirante ──────────────────────────────────────────────
  'experiences.manage': {
    group: 'candidate',
    label: 'Experiencia laboral',
    description: 'Añadir y editar los empleos del propio perfil.',
    scopes: CANDIDATE_ONLY,
  },
  'educations.manage': {
    group: 'candidate',
    label: 'Formación académica',
    description: 'Añadir y editar los estudios del propio perfil.',
    scopes: CANDIDATE_ONLY,
  },
  'languages.manage': {
    group: 'candidate',
    label: 'Idiomas',
    description: 'Declarar idiomas y nivel de dominio.',
    scopes: CANDIDATE_ONLY,
  },
  'skills.manage': {
    group: 'candidate',
    label: 'Habilidades',
    description: 'Declarar las habilidades del propio perfil.',
    scopes: CANDIDATE_ONLY,
  },
  'resumes.manage': {
    group: 'candidate',
    label: 'Hojas de vida',
    description: 'Subir, reemplazar y borrar los CV propios.',
    scopes: CANDIDATE_ONLY,
  },
  'saved_vacancies.manage': {
    group: 'candidate',
    label: 'Vacantes guardadas',
    description: 'Guardar vacantes para revisarlas después.',
    scopes: CANDIDATE_ONLY,
  },
  'settings.read': {
    group: 'candidate',
    label: 'Ver configuración',
    description: 'Consultar visibilidad del perfil y disponibilidad.',
    scopes: CANDIDATE_ONLY,
  },
  'settings.update': {
    group: 'candidate',
    label: 'Editar configuración',
    description: 'Cambiar visibilidad del perfil y disponibilidad.',
    scopes: CANDIDATE_ONLY,
  },

  // ── Cuenta propia ─────────────────────────────────────────────────────
  'account.profile_manage': {
    group: 'account',
    label: 'Mi cuenta',
    description: 'Editar identidad, contraseña y foto propias.',
    scopes: ALL_SCOPES,
  },
  'account.data_export': {
    group: 'account',
    label: 'Exportar mis datos',
    description: 'Descargar una copia de los datos de la propia cuenta.',
    scopes: ALL_SCOPES,
  },
  'account.delete': {
    group: 'account',
    label: 'Eliminar mi cuenta',
    description: 'Solicitar la baja de la propia cuenta.',
    scopes: ALL_SCOPES,
  },
  'notifications.read': {
    group: 'account',
    label: 'Ver notificaciones',
    description: 'Leer los avisos de la plataforma y marcarlos como leídos.',
    scopes: ALL_SCOPES,
  },
};

/**
 * Permisos que **toda** cuenta necesita para que la app sea usable: leer
 * catálogos, ver el portal, gestionar su propia cuenta y sus avisos. Se
 * conceden por código, así que un rol personalizado recién creado ya funciona
 * y nadie puede dejar la sesión de alguien sin lo básico por descuido.
 */
const COMMON_BASELINE: readonly string[] = [
  'catalogs.read',
  'vacancies.read.public',
  'plans.read',
  'account.profile_manage',
  'notifications.read',
];

/**
 * Lo que concede el ámbito por sí solo, sin fila en `role_permissions`.
 *
 * El aspirante lo tiene **todo** aquí: es la decisión de producto de que su rol
 * no se administre. Postular, subir el CV o guardar una vacante no pueden
 * depender de que alguien no haya tocado una casilla ni de que el seed se haya
 * ejecutado en ese entorno.
 */
export const SCOPE_BASELINE: Readonly<Record<RoleScope, readonly string[]>> = {
  [RoleScope.PLATFORM]: COMMON_BASELINE,
  [RoleScope.COMPANY]: COMMON_BASELINE,
  [RoleScope.CANDIDATE]: [
    ...COMMON_BASELINE,
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
    'account.data_export',
    'account.delete',
  ],
};

/**
 * Permisos que no se le pueden quitar al rol ADMIN de sistema. Sin ellos nadie
 * puede volver a entrar a `/admin/roles` a deshacer el cambio: la plataforma se
 * quedaría sin llave y sólo se repararía por SQL.
 */
export const PROTECTED_ROLE_PERMISSIONS: Readonly<
  Record<string, readonly string[]>
> = {
  ADMIN: ['users.read', 'roles.read', 'permissions.assign'],
};

const EMPTY: readonly string[] = [];

/** Metadatos de un permiso; `other` + el código si no está catalogado. */
export function permissionMeta(code: string): PermissionMeta {
  return (
    PERMISSION_CATALOG[code] ?? {
      group: FALLBACK_GROUP,
      label: code,
      description: 'Permiso sin descripción en el catálogo.',
      // Sin catalogar se ofrece sólo al back-office: es el ámbito que puede
      // razonar sobre un permiso que nadie documentó.
      scopes: BACK_OFFICE,
    }
  );
}

/** Códigos concedidos siempre a un rol: base del ámbito + blindaje del rol. */
export function lockedPermissionCodes(
  scope: RoleScope,
  roleCode: string,
  isSystem: boolean,
): Set<string> {
  const locked = new Set<string>(SCOPE_BASELINE[scope] ?? EMPTY);
  if (isSystem) {
    for (const code of PROTECTED_ROLE_PERMISSIONS[roleCode] ?? EMPTY) {
      locked.add(code);
    }
  }
  return locked;
}
