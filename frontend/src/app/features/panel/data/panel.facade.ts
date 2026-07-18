import { Injectable } from '@angular/core';
import { IconName } from '@/shared/ui';
import { PALETTE_HEX } from '@/features/panel/panel.theme';
import {
  AdminDashboard,
  AreaChart,
  BadgeKind,
  BenefitCell,
  BenefitRow,
  DonutChart,
  EmpresaDashboard,
  JobItem,
  PanelCell,
  PanelColor,
  PanelContent,
  PanelKpi,
  PanelMeta,
  PanelNavItem,
  PanelRole,
  PanelTable,
  PostulanteDashboard,
  PromoTier,
} from '@/features/panel/models/panel.models';

const ORDER: readonly PanelColor[] = [
  'brand',
  'blue',
  'green',
  'amber',
  'pink',
  'teal',
];

/**
 * Facade del panel. Concentra todos los datos de demostración y la resolución
 * de cada vista (portado desde el prototipo de diseño). Sustituir por llamadas
 * reales a los módulos del backend (iam, companies, vacancies, …) más adelante.
 */
@Injectable({ providedIn: 'root' })
export class PanelFacade {
  // ---------------------------------------------------------------- navegación
  nav(role: PanelRole, view: string): readonly PanelNavItem[] {
    const defs: readonly [string, IconName, string, string?][] =
      role === 'admin'
        ? [
            ['Dashboard', 'home', 'dashboard'],
            ['Usuarios', 'users', 'usuarios'],
            ['Roles y permisos', 'shield', 'roles'],
            ['Empresas', 'building', 'empresas'],
            ['Vacantes', 'briefcase', 'vacantes', '1.2k'],
            ['Postulaciones', 'file', 'postulaciones'],
            ['Planes y beneficios', 'credit-card', 'planes'],
            ['Promociones', 'award', 'promociones', '113'],
            ['Catálogos', 'list', 'catalogos'],
            ['Auditoría', 'history', 'auditoria'],
          ]
        : role === 'empresa'
          ? [
              ['Dashboard', 'home', 'dashboard'],
              ['Mis vacantes', 'briefcase', 'vacantes'],
              ['Nueva vacante', 'plus', 'nueva-vacante'],
              ['Postulaciones', 'file', 'postulaciones', '412'],
              ['Buscar candidatos', 'search', 'candidatos'],
              ['Promociona tu vacante', 'award', 'promociones'],
              ['Usuarios de la empresa', 'users', 'equipo'],
              ['Perfil de empresa', 'building', 'perfil'],
            ]
          : [
              ['Dashboard', 'home', 'dashboard'],
              ['Buscar empleo', 'search', 'buscar'],
              ['Mis postulaciones', 'file', 'postulaciones', '12'],
              ['Mi perfil', 'user', 'perfil'],
              ['Hoja de vida', 'credit-card', 'cv'],
              ['Configuración', 'settings', 'config'],
            ];

    return defs.map(([label, icon, key, badge]) => ({ key, label, icon, badge }));
  }

  // --------------------------------------------------------------------- metas
  meta(role: PanelRole, view: string): PanelMeta {
    interface RoleMeta {
      section: string;
      userName: string;
      roleLabel: string;
      initials: string;
      avatar: PanelColor;
      crumbRoot: string;
      dashTitle: string;
      dashSub: string;
    }
    const base: Record<PanelRole, RoleMeta> = {
      admin: {
        section: 'PLATAFORMA',
        userName: 'Emay Walter',
        roleLabel: 'Administrador',
        initials: 'EW',
        avatar: 'brand',
        crumbRoot: 'Administración',
        dashTitle: 'Panel de administración',
        dashSub: 'Supervisa y configura toda la plataforma Impulso Jobs',
      },
      empresa: {
        section: 'RECLUTAMIENTO',
        userName: 'Northwind Corp',
        roleLabel: 'Reclutador',
        initials: 'NC',
        avatar: 'blue',
        crumbRoot: 'Empresa',
        dashTitle: 'Panel de empresa',
        dashSub: 'Gestiona tus vacantes y procesos — Northwind Corp',
      },
      postulante: {
        section: 'MI CUENTA',
        userName: 'María Ferreira',
        roleLabel: 'Aspirante',
        initials: 'MF',
        avatar: 'green',
        crumbRoot: 'Aspirante',
        dashTitle: 'Mi panel',
        dashSub: 'Sigue tus postulaciones y descubre empleos para ti',
      },
    };

    const m = base[role];

    const titles: Record<string, [string, string]> = {
      'admin/usuarios': ['Usuarios', 'Consulta, activa, bloquea o elimina usuarios'],
      'admin/roles': ['Roles y permisos', 'Roles de plataforma y su alcance (RBAC)'],
      'admin/empresas': ['Empresas', 'Supervisión de empresas registradas (solo lectura)'],
      'admin/vacantes': ['Vacantes', 'Supervisión global de vacantes (solo lectura)'],
      'admin/postulaciones': ['Postulaciones', 'Supervisión global de postulaciones (solo lectura)'],
      'admin/planes': ['Planes y beneficios', 'Catálogo de planes de promoción de vacantes'],
      'admin/promociones': ['Promociones', 'Empresas que pagaron y estado de cada promoción'],
      'admin/catalogos': ['Catálogos', 'Administra los catálogos del sistema'],
      'admin/auditoria': ['Auditoría', 'Bitácora de acciones de la plataforma'],
      'empresa/vacantes': ['Mis vacantes', 'Crea, edita, pausa o cierra tus vacantes'],
      'empresa/nueva-vacante': ['Nueva vacante', 'Publica una vacante — con Datepicker, Select2 y Typeahead'],
      'empresa/postulaciones': ['Postulaciones', 'Candidatos que aplicaron a tus vacantes'],
      'empresa/candidatos': ['Buscar candidatos', 'Banco de hojas de vida según visibilidad'],
      'empresa/promociones': ['Promociona tu vacante', 'Compra un plan para destacar una vacante 60 días'],
      'empresa/equipo': ['Usuarios de la empresa', 'Miembros y su rol interno (OWNER/ADMIN)'],
      'empresa/perfil': ['Perfil de empresa', 'Información corporativa (NIT no editable)'],
      'postulante/buscar': ['Buscar empleo', 'Vacantes que coinciden con tu perfil'],
      'postulante/postulaciones': ['Mis postulaciones', 'Seguimiento del estado (solo lectura)'],
      'postulante/perfil': ['Mi perfil', 'Información, experiencia, educación e idiomas'],
      'postulante/cv': ['Hoja de vida', 'Sube tus PDF y define la principal'],
      'postulante/config': ['Configuración', 'Visibilidad del perfil y disponibilidad'],
    };

    const shared = {
      section: m.section,
      userName: m.userName,
      roleLabel: m.roleLabel,
      initials: m.initials,
      avatar: m.avatar,
    };

    if (view === 'dashboard') {
      return { ...shared, title: m.dashTitle, subtitle: m.dashSub, crumb: m.crumbRoot };
    }
    const t = titles[`${role}/${view}`] ?? [m.crumbRoot, ''];
    return { ...shared, title: t[0], subtitle: t[1], crumb: t[0] };
  }

  // ---------------------------------------------------------------------- KPIs
  kpis(role: PanelRole, view: string): readonly PanelKpi[] {
    const k = (
      label: string,
      value: string,
      icon: IconName,
      kind: PanelColor,
      delta?: string,
      up = true,
      note?: string,
    ): PanelKpi => ({ label, value, icon, kind, delta, up, note });

    if (view === 'dashboard') {
      if (role === 'admin')
        return [
          k('Vacantes activas', '1,284', 'briefcase', 'brand', '8.2%', true, 'vs. mes anterior'),
          k('Empresas', '342', 'building', 'blue', '3.1%', true, 'nuevas: 12'),
          k('Candidatos', '18,940', 'users', 'green', '12.0%', true, 'activos'),
          k('Postulaciones / mes', '6,120', 'file', 'amber', '2.4%', false, 'vs. mes anterior'),
        ];
      if (role === 'empresa')
        return [
          k('Vacantes publicadas', '18', 'briefcase', 'brand', undefined, true, '3 en borrador'),
          k('Postulaciones', '412', 'file', 'blue', '14.0%', true, 'esta semana'),
          k('En entrevista', '62', 'calendar', 'amber', undefined, true, '6 hoy'),
          k('Contrataciones', '8', 'check', 'green', undefined, true, 'este trimestre'),
        ];
      return [
        k('Postulaciones', '12', 'send', 'brand', undefined, true, '4 activas'),
        k('En revisión', '5', 'file', 'blue', undefined, true, 'esperando'),
        k('Entrevistas', '2', 'calendar', 'amber', undefined, true, '1 esta semana'),
        k('Vistas de perfil', '148', 'eye', 'green', '22.0%', true, 'últimos 30 días'),
      ];
    }

    if (role === 'admin') {
      if (view === 'usuarios')
        return [
          k('Usuarios', '19,287', 'users', 'brand'),
          k('Candidatos', '18,940', 'user', 'blue'),
          k('Reclutadores', '347', 'briefcase', 'green'),
          k('Bloqueados', '23', 'shield', 'amber'),
        ];
      if (view === 'empresas')
        return [
          k('Empresas', '342', 'building', 'brand'),
          k('Con promoción activa', '113', 'award', 'green', '6.0%'),
          k('Verificadas', '301', 'shield', 'blue'),
          k('Pendientes', '18', 'clock', 'amber'),
        ];
      if (view === 'vacantes')
        return [
          k('Total vacantes', '1,284', 'briefcase', 'brand'),
          k('Activas', '842', 'check', 'green'),
          k('Promocionadas', '113', 'award', 'blue'),
          k('Cerradas', '226', 'pause', 'amber'),
        ];
      if (view === 'planes')
        return [
          k('Ingresos (mes)', '$14,2M', 'dollar', 'brand', '9.0%', true, 'COP'),
          k('Promociones activas', '113', 'award', 'green', '6.0%'),
          k('Plan más comprado', 'Pro', 'credit-card', 'blue'),
          k('Ticket promedio', '$168k', 'chart', 'amber'),
        ];
      if (view === 'promociones')
        return [
          k('Activas', '113', 'award', 'green'),
          k('Pendiente de pago', '12', 'clock', 'amber'),
          k('Expiradas (mes)', '41', 'history', 'blue'),
          k('Ingresos (mes)', '$14,2M', 'dollar', 'brand', '9.0%', true, 'COP'),
        ];
    }

    if (role === 'empresa') {
      if (view === 'vacantes')
        return [
          k('Publicadas', '18', 'briefcase', 'brand'),
          k('Activas', '14', 'check', 'green'),
          k('Postulaciones', '412', 'file', 'blue'),
          k('Promocionadas', '3', 'award', 'amber'),
        ];
      if (view === 'postulaciones')
        return [
          k('Nuevas', '36', 'send', 'brand', undefined, true, 'esta semana'),
          k('En proceso', '148', 'file', 'blue'),
          k('Entrevista', '62', 'calendar', 'amber'),
          k('Contratados', '8', 'check', 'green'),
        ];
      if (view === 'promociones')
        return [
          k('Vacantes promocionadas', '3', 'award', 'brand'),
          k('Impulso activo', '+40%', 'flash', 'green'),
          k('Postulaciones extra', '+42%', 'chart', 'blue'),
          k('Gasto (mes)', '$490k', 'dollar', 'amber', undefined, true, 'COP'),
        ];
    }

    if (role === 'postulante' && view === 'postulaciones')
      return [
        k('Enviadas', '12', 'send', 'brand'),
        k('En revisión', '5', 'file', 'blue'),
        k('Entrevistas', '2', 'calendar', 'amber'),
        k('Ofertas', '1', 'check', 'green'),
      ];

    return [];
  }

  // ---------------------------------------------------- resolución de contenido
  resolveContent(role: PanelRole, view: string): PanelContent {
    if (view === 'dashboard') return `${role}-dashboard` as PanelContent;
    if (role === 'admin' && view === 'planes') return 'plans-catalog';
    if (role === 'empresa' && view === 'promociones') return 'promo-buy';
    if (role === 'empresa' && view === 'nueva-vacante') return 'vacancy-form';
    if (role === 'postulante' && view === 'buscar') return 'job-cards';
    if (role === 'postulante' && view === 'perfil') return 'candidate-profile';
    if (role === 'postulante' && view === 'cv') return 'candidate-resumes';
    if (role === 'postulante' && view === 'config') return 'candidate-settings';
    return this.table(role, view) ? 'table' : 'empty';
  }

  // ------------------------------------------------------------- gráficos util.
  private linePath(vals: readonly number[]): Omit<AreaChart, 'months'> {
    const w = 640,
      h = 220,
      padX = 16,
      padTop = 20,
      padBot = 30;
    const max = Math.max(...vals),
      min = Math.min(...vals),
      n = vals.length;
    const x = (i: number) => padX + (i * (w - 2 * padX)) / (n - 1);
    const y = (v: number) =>
      h - padBot - ((v - min) / (max - min)) * (h - padTop - padBot);
    let d = `M ${x(0).toFixed(1)} ${y(vals[0]).toFixed(1)}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i).toFixed(1)} ${y(vals[i]).toFixed(1)}`;
    const area = `${d} L ${x(n - 1).toFixed(1)} ${h - padBot} L ${x(0).toFixed(1)} ${h - padBot} Z`;
    return { line: d, area, points: vals.map((v, i) => ({ cx: x(i).toFixed(1), cy: y(v).toFixed(1) })) };
  }

  private donut(
    segs: readonly { label: string; value: number; color: string }[],
  ): DonutChart {
    const c = 2 * Math.PI * 70;
    const total = segs.reduce((a, s) => a + s.value, 0);
    let off = 0;
    const segments = segs.map((s) => {
      const len = (s.value / total) * c;
      const seg = {
        color: s.color,
        dash: `${len.toFixed(2)} ${(c - len).toFixed(2)}`,
        offset: (-off).toFixed(2),
      };
      off += len;
      return seg;
    });
    return {
      segments,
      total,
      legend: segs.map((s) => ({ label: s.label, color: s.color, value: s.value })),
    };
  }

  // ------------------------------------------------------------ dashboard admin
  adminDashboard(): AdminDashboard {
    const vals = [2100, 2480, 2260, 3050, 3380, 3720, 3510, 4180, 4620, 4400, 5230, 6120];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const donut = this.donut([
      { label: 'Activas', value: 842, color: PALETTE_HEX.brand },
      { label: 'Pausadas', value: 216, color: PALETTE_HEX.amber },
      { label: 'Cerradas', value: 226, color: PALETTE_HEX.green },
    ]);
    const catsRaw: [string, number, string][] = [
      ['Tecnología', 342, PALETTE_HEX.brand],
      ['Ventas', 268, PALETTE_HEX.blue],
      ['Marketing', 214, PALETTE_HEX.amber],
      ['Finanzas', 176, PALETTE_HEX.green],
      ['Diseño', 132, PALETTE_HEX.pink],
      ['Salud', 98, '#8a8a9e'],
    ];
    const cm = Math.max(...catsRaw.map((c) => c[1]));
    return {
      area: { ...this.linePath(vals), months },
      donut,
      categories: catsRaw.map((c) => ({
        label: c[0],
        value: c[1],
        pct: +((c[1] / cm) * 100).toFixed(1),
        color: c[2],
      })),
      companies: [
        { name: 'Northwind Corp', sector: 'Tecnología', vacancies: 24, initials: 'NC', logo: 'brand', status: 'Verificada', statusKind: 'green' },
        { name: 'Vela Retail', sector: 'Comercio', vacancies: 12, initials: 'VR', logo: 'blue', status: 'Verificada', statusKind: 'green' },
        { name: 'Aster Health', sector: 'Salud', vacancies: 8, initials: 'AH', logo: 'amber', status: 'Pendiente', statusKind: 'amber' },
        { name: 'Lumen Studio', sector: 'Diseño', vacancies: 5, initials: 'LS', logo: 'pink', status: 'Verificada', statusKind: 'green' },
        { name: 'Cobalt Labs', sector: 'Finanzas', vacancies: 17, initials: 'CL', logo: 'green', status: 'En revisión', statusKind: 'brand' },
      ],
    };
  }

  // ---------------------------------------------------------- dashboard empresa
  empresaDashboard(): EmpresaDashboard {
    const fRaw: [string, number, string][] = [
      ['Postulados', 412, PALETTE_HEX.brand],
      ['Preseleccionados', 148, PALETTE_HEX.blue],
      ['Entrevista', 62, PALETTE_HEX.amber],
      ['Oferta', 21, PALETTE_HEX.pink],
      ['Contratados', 8, PALETTE_HEX.green],
    ];
    const fm = fRaw[0][1];
    const vRaw: [string, number, string][] = [
      ['Frontend', 84, PALETTE_HEX.brand],
      ['Backend', 71, PALETTE_HEX.brand],
      ['Product', 52, PALETTE_HEX.blue],
      ['UX', 46, PALETTE_HEX.blue],
      ['QA', 31, PALETTE_HEX.amber],
      ['DevOps', 24, PALETTE_HEX.amber],
    ];
    const vm = Math.max(...vRaw.map((v) => v[1]));
    return {
      funnel: fRaw.map((f, i) => ({
        label: f[0],
        count: f[1],
        conv: i === 0 ? '100%' : `${Math.round((f[1] / fm) * 100)}%`,
        pct: +Math.max((f[1] / fm) * 100, 6).toFixed(1),
        color: f[2],
      })),
      vacancyBars: vRaw.map((v) => ({
        label: v[0],
        value: v[1],
        pct: +((v[1] / vm) * 100).toFixed(1),
        color: v[2],
      })),
      candidates: [
        { name: 'María Ferreira', location: 'Bogotá, CO', role: 'Frontend Sr.', match: 94, initials: 'MF', avatar: 'brand', stage: 'Entrevista', stageKind: 'amber', date: 'hoy' },
        { name: 'Diego Salcedo', location: 'Lima, PE', role: 'Backend Sr.', match: 88, initials: 'DS', avatar: 'blue', stage: 'Preseleccionado', stageKind: 'blue', date: 'ayer' },
        { name: 'Ana Ríos', location: 'CDMX, MX', role: 'Product Manager', match: 81, initials: 'AR', avatar: 'pink', stage: 'Oferta', stageKind: 'brand', date: '2 días' },
        { name: 'Bruno Costa', location: 'São Paulo, BR', role: 'UX Designer', match: 76, initials: 'BC', avatar: 'green', stage: 'Postulado', stageKind: 'gray', date: '3 días' },
        { name: 'Lucía Mena', location: 'Santiago, CL', role: 'QA Engineer', match: 69, initials: 'LM', avatar: 'amber', stage: 'Postulado', stageKind: 'gray', date: '4 días' },
      ],
    };
  }

  // ------------------------------------------------------- dashboard postulante
  postulanteDashboard(): PostulanteDashboard {
    const pct = 78;
    const c = 2 * Math.PI * 60;
    const stages = ['Enviada', 'Revisión', 'Entrevista', 'Decisión'];
    const appRaw: {
      title: string;
      company: string;
      date: string;
      initials: string;
      logo: PanelColor;
      stageIdx: number;
      stageLabel: string;
      stageKind: BadgeKind;
    }[] = [
      { title: 'Frontend Engineer', company: 'Northwind Corp', date: 'hace 2 días', initials: 'NC', logo: 'brand', stageIdx: 2, stageLabel: 'En entrevista', stageKind: 'amber' },
      { title: 'Product Designer', company: 'Lumen Studio', date: 'hace 5 días', initials: 'LS', logo: 'pink', stageIdx: 1, stageLabel: 'En revisión', stageKind: 'blue' },
      { title: 'UI Engineer', company: 'Vela Retail', date: 'hace 1 semana', initials: 'VR', logo: 'blue', stageIdx: 3, stageLabel: 'Oferta recibida', stageKind: 'green' },
      { title: 'QA Analyst', company: 'Aster Health', date: 'hace 2 semanas', initials: 'AH', logo: 'amber', stageIdx: 0, stageLabel: 'Enviada', stageKind: 'brand' },
    ];
    return {
      jobs: this.jobList().slice(0, 4),
      profilePct: pct,
      ringDash: `${((pct / 100) * c).toFixed(1)} ${c.toFixed(1)}`,
      tasks: [
        { label: 'Datos personales', done: true },
        { label: 'Experiencia laboral', done: true },
        { label: 'Sube tu hoja de vida (PDF)', done: true },
        { label: 'Idiomas y habilidades', done: false },
        { label: 'Configura tu visibilidad', done: false },
      ],
      applications: appRaw.map((a) => ({
        title: a.title,
        company: a.company,
        date: a.date,
        initials: a.initials,
        logo: a.logo,
        stageLabel: a.stageLabel,
        stageKind: a.stageKind,
        steps: stages.map((label, i) => ({
          label,
          done: i <= a.stageIdx,
          current: i === a.stageIdx,
        })),
      })),
    };
  }

  // ------------------------------------------------------------------ empleos
  jobList(): readonly JobItem[] {
    return [
      { title: 'Frontend Engineer', company: 'Northwind Corp', location: 'Remoto', match: '94%', salary: '$4.5k–6k', initials: 'NC', logo: 'brand', tags: ['React', 'TypeScript', 'Remoto'] },
      { title: 'Product Designer', company: 'Lumen Studio', location: 'Híbrido · Bogotá', match: '88%', salary: '$3.8k–5k', initials: 'LS', logo: 'pink', tags: ['Figma', 'Design System'] },
      { title: 'Full-Stack Developer', company: 'Cobalt Labs', location: 'Remoto', match: '82%', salary: '$4k–5.5k', initials: 'CL', logo: 'green', tags: ['Node', 'React', 'AWS'] },
      { title: 'UI Engineer', company: 'Vela Retail', location: 'Presencial · Lima', match: '77%', salary: '$3.2k–4k', initials: 'VR', logo: 'blue', tags: ['CSS', 'Vue'] },
      { title: 'Data Analyst', company: 'Orion Systems', location: 'Remoto', match: '74%', salary: '$3.5k–4.5k', initials: 'OS', logo: 'teal', tags: ['SQL', 'Python', 'BI'] },
      { title: 'Mobile Developer', company: 'Zenith Media', location: 'Híbrido · CDMX', match: '71%', salary: '$4k–5k', initials: 'ZM', logo: 'amber', tags: ['Flutter', 'Kotlin'] },
    ];
  }

  // -------------------------------------------------------- planes / beneficios
  promoTiers(): readonly PromoTier[] {
    const note = 'COP · IVA 19% incluido';
    const duration = '60 días de publicación';
    return [
      { name: 'Essential', price: '$100.095', priceNote: note, duration, popular: false, count: 34, features: ['60 días de publicación', 'Datos de contacto ilimitados'] },
      { name: 'Pro', price: '$175.395', priceNote: note, duration, popular: true, count: 58, features: ['Todo lo de Essential', 'Impulso de postulaciones +20%', 'Ranking prioritario', 'Aviso destacado', 'Búsqueda urgente'] },
      { name: 'Premium', price: '$215.145', priceNote: note, duration, popular: false, count: 21, features: ['Todo lo de Pro', 'Confidencialidad de la empresa', 'Impulso de postulaciones +40%', '+10 accesos a hojas de vida'] },
    ];
  }

  benefitMatrix(): readonly BenefitRow[] {
    const cell = (v: string): BenefitCell =>
      v === 'check'
        ? { kind: 'check' }
        : v === 'dash'
          ? { kind: 'dash' }
          : { kind: 'text', text: v };
    const rows: [string, string, string, string][] = [
      ['Días de publicación', '60', '60', '60'],
      ['Datos de contacto ilimitados', 'check', 'check', 'check'],
      ['Impulso de postulaciones', 'dash', '+20%', '+40%'],
      ['Ranking prioritario', 'dash', 'check', 'check'],
      ['Aviso destacado', 'dash', 'check', 'check'],
      ['Búsqueda urgente', 'dash', 'check', 'check'],
      ['Confidencialidad de la empresa', 'dash', 'dash', 'check'],
      ['Acceso extra a hojas de vida', 'dash', 'dash', '10'],
    ];
    return rows.map((r) => ({ label: r[0], cells: [cell(r[1]), cell(r[2]), cell(r[3])] }));
  }

  // -------------------------------------------------------- opciones del form
  readonly categorias = ['Tecnología', 'Ventas', 'Marketing', 'Finanzas', 'Diseño', 'Salud', 'Operaciones', 'Recursos Humanos', 'Legal', 'Educación'];
  readonly habilidades = ['React', 'Angular', 'Vue', 'TypeScript', 'Node.js', 'Python', 'SQL', 'AWS', 'Figma', 'UX Research', 'Scrum', 'Java', 'Docker', 'Product'];
  readonly modalidades = ['Remoto', 'Híbrido', 'Presencial'];
  readonly tipos = ['Tiempo completo', 'Medio tiempo', 'Por contrato', 'Temporal', 'Prácticas'];
  readonly titulos = ['Frontend Engineer', 'Backend Engineer', 'Full-Stack Developer', 'Product Manager', 'UX Designer', 'UI Engineer', 'Data Analyst', 'DevOps Engineer', 'QA Engineer', 'Mobile Developer', 'Scrum Master', 'Tech Lead'];
  readonly ciudades = ['Bogotá, CO', 'Medellín, CO', 'Cali, CO', 'Barranquilla, CO', 'Lima, PE', 'Ciudad de México, MX', 'Santiago, CL', 'Buenos Aires, AR', 'Remoto'];

  // -------------------------------------------------------------- tablas
  private avatar(name: string, initials: string, i: number, sub = ''): PanelCell {
    return { type: 'avatar', name, sub, initials, kind: ORDER[i % 6] };
  }
  private badge(text: string, kind: BadgeKind): PanelCell {
    return { type: 'badge', text, badgeKind: kind };
  }
  private text(text: string): PanelCell {
    return { type: 'text', text, variant: 'default' };
  }
  private strong(text: string): PanelCell {
    return { type: 'text', text, variant: 'strong' };
  }
  private muted(text: string): PanelCell {
    return { type: 'text', text, variant: 'muted' };
  }
  private progress(pct: number): PanelCell {
    return { type: 'progress', pct };
  }
  private plan(name: string): PanelCell {
    return this.badge(name, name === 'Pro' ? 'brand' : name === 'Premium' ? 'gold' : 'gray');
  }

  table(role: PanelRole, view: string): PanelTable | null {
    const a = (n: string, ini: string, i: number, sub = '') => this.avatar(n, ini, i, sub);
    const b = (t: string, k: BadgeKind) => this.badge(t, k);

    if (role === 'admin') {
      if (view === 'usuarios')
        return {
          filters: ['Todos', 'Activos', 'Bloqueados', 'Sin verificar'],
          columns: ['Usuario', 'Rol', 'Registro', 'Estado'],
          rows: [
            [a('Emay Walter', 'EW', 0, 'emay@impulso.io'), b('ADMIN', 'brand'), this.muted('Feb 2024'), b('Activo', 'green')],
            [a('Northwind Corp', 'NC', 1, 'hr@northwind.co'), b('EMPLOYER', 'blue'), this.muted('Mar 2024'), b('Activo', 'green')],
            [a('María Ferreira', 'MF', 2, 'maria.f@mail.com'), b('CANDIDATE', 'gray'), this.muted('Abr 2024'), b('Activo', 'green')],
            [a('Diego Salcedo', 'DS', 3, 'diego.s@mail.com'), b('CANDIDATE', 'gray'), this.muted('May 2024'), b('Sin verificar', 'amber')],
            [a('Ghost Corp', 'GC', 4, 'x@ghost.io'), b('EMPLOYER', 'blue'), this.muted('Jun 2024'), b('Bloqueado', 'red')],
            [a('Ana Ríos', 'AR', 5, 'ana.r@mail.com'), b('CANDIDATE', 'gray'), this.muted('Jun 2024'), b('Activo', 'green')],
          ],
        };
      if (view === 'roles')
        return {
          title: 'Roles de plataforma',
          columns: ['Rol', 'Descripción', 'Usuarios', 'Alcance'],
          rows: [
            [b('ADMIN', 'brand'), this.text('Gobierna la plataforma'), this.strong('5'), this.muted('Global')],
            [b('EMPLOYER', 'blue'), this.text('Gestiona su empresa y procesos'), this.strong('347'), this.muted('Propio (empresa)')],
            [b('CANDIDATE', 'gray'), this.text('Gestiona su perfil y postulaciones'), this.strong('18,940'), this.muted('Propio (cuenta)')],
          ],
        };
      if (view === 'empresas')
        return {
          filters: ['Todas', 'Con promoción', 'Verificadas', 'Pendientes'],
          columns: ['Empresa', 'Sector', 'Vacantes', 'Promos activas', 'Estado'],
          rows: [
            [a('Orion Systems', 'OS', 4), this.text('Tecnología'), this.strong('41'), this.strong('3'), b('Verificada', 'green')],
            [a('Northwind Corp', 'NC', 0), this.text('Tecnología'), this.strong('24'), this.strong('2'), b('Verificada', 'green')],
            [a('Cobalt Labs', 'CL', 2), this.text('Finanzas'), this.strong('17'), this.strong('1'), b('Verificada', 'green')],
            [a('Vela Retail', 'VR', 1), this.text('Comercio'), this.strong('12'), this.strong('0'), b('Verificada', 'green')],
            [a('Aster Health', 'AH', 3), this.text('Salud'), this.strong('8'), this.strong('0'), b('Pendiente', 'amber')],
            [a('Lumen Studio', 'LS', 4), this.text('Diseño'), this.strong('5'), this.strong('1'), b('Verificada', 'green')],
          ],
        };
      if (view === 'vacantes')
        return {
          filters: ['Todas', 'Activas', 'Promocionadas', 'Cerradas'],
          columns: ['Vacante', 'Empresa', 'Estado', 'Promoción', 'Postulaciones'],
          rows: [
            [this.strong('Frontend Engineer'), this.text('Northwind Corp'), b('Activa', 'green'), b('Pro', 'brand'), this.strong('84')],
            [this.strong('Data Lead'), this.text('Orion Systems'), b('Activa', 'green'), b('Premium', 'gold'), this.strong('62')],
            [this.strong('Store Manager'), this.text('Vela Retail'), b('Activa', 'green'), b('Sin promoción', 'gray'), this.strong('28')],
            [this.strong('Contador Senior'), this.text('Cobalt Labs'), b('Pausada', 'amber'), b('Sin promoción', 'gray'), this.strong('37')],
            [this.strong('Enfermero/a'), this.text('Aster Health'), b('Activa', 'green'), b('Sin promoción', 'gray'), this.strong('21')],
            [this.strong('UX Designer'), this.text('Lumen Studio'), b('Cerrada', 'gray'), b('Premium', 'gold'), this.strong('46')],
          ],
        };
      if (view === 'postulaciones')
        return {
          title: 'Postulaciones (solo lectura)',
          filters: ['Todas', 'En proceso', 'Contratadas', 'Rechazadas'],
          columns: ['Candidato', 'Vacante', 'Empresa', 'Estado', 'Fecha'],
          rows: [
            [a('María Ferreira', 'MF', 0), this.text('Frontend Engineer'), this.text('Northwind Corp'), b('Entrevista', 'amber'), this.muted('01 Jul')],
            [a('Diego Salcedo', 'DS', 1), this.text('Data Lead'), this.text('Orion Systems'), b('Preseleccionado', 'blue'), this.muted('30 Jun')],
            [a('Ana Ríos', 'AR', 4), this.text('Store Manager'), this.text('Vela Retail'), b('Oferta', 'brand'), this.muted('29 Jun')],
            [a('Bruno Costa', 'BC', 2), this.text('UX Designer'), this.text('Lumen Studio'), b('Contratado', 'green'), this.muted('24 Jun')],
            [a('Lucía Mena', 'LM', 3), this.text('Contador Senior'), this.text('Cobalt Labs'), b('Rechazado', 'red'), this.muted('22 Jun')],
          ],
        };
      if (view === 'promociones')
        return {
          title: 'Promociones de vacantes',
          filters: ['Todas', 'Activas', 'Pendiente de pago', 'Expiradas'],
          columns: ['Empresa', 'Vacante', 'Plan', 'Estado', 'Importe', 'Vence'],
          rows: [
            [a('Orion Systems', 'OS', 4), this.text('Data Lead'), this.plan('Premium'), b('Activa', 'green'), this.strong('$215.145'), this.muted('20 Ago 2026')],
            [a('Northwind Corp', 'NC', 0), this.text('Frontend Engineer'), this.plan('Pro'), b('Activa', 'green'), this.strong('$175.395'), this.muted('12 Ago 2026')],
            [a('Cobalt Labs', 'CL', 2), this.text('Analista BI'), this.plan('Pro'), b('Activa', 'green'), this.strong('$175.395'), this.muted('05 Ago 2026')],
            [a('Zenith Media', 'ZM', 5), this.text('Mobile Developer'), this.plan('Essential'), b('Activa', 'green'), this.strong('$100.095'), this.muted('15 Ago 2026')],
            [a('Vela Retail', 'VR', 1), this.text('Store Manager'), this.plan('Essential'), b('Pendiente de pago', 'amber'), this.strong('$100.095'), this.muted('—')],
            [a('Lumen Studio', 'LS', 4), this.text('UX Designer'), this.plan('Premium'), b('Expirada', 'red'), this.strong('$215.145'), this.muted('venció 28 Jun')],
          ],
        };
      if (view === 'catalogos')
        return {
          title: 'Catálogos del sistema',
          columns: ['Catálogo', 'Elementos', 'Actualizado'],
          rows: [
            [this.strong('Tipos de documento'), this.text('6'), this.muted('Feb 2024')],
            [this.strong('Idiomas'), this.text('42'), this.muted('Mar 2024')],
            [this.strong('Estados de postulación'), this.text('7'), this.muted('Abr 2024')],
            [this.strong('Niveles de formación'), this.text('8'), this.muted('Abr 2024')],
            [this.strong('Tipos de empleo'), this.text('5'), this.muted('May 2024')],
            [this.strong('Modalidades'), this.text('3'), this.muted('May 2024')],
          ],
        };
      if (view === 'auditoria')
        return {
          title: 'Bitácora del sistema',
          filters: ['Todo', 'Auth', 'Usuarios', 'Billing'],
          columns: ['Acción', 'Componente', 'Usuario', 'IP', 'Fecha'],
          rows: [
            [this.strong('login'), this.text('auth'), this.text('Emay Walter'), this.muted('190.24.11.8'), this.muted('09 Jul 08:12')],
            [this.strong('plans.update'), this.text('billing'), this.text('Nora Vega'), this.muted('190.24.11.9'), this.muted('08 Jul 17:40')],
            [this.strong('users.block'), this.text('users'), this.text('Lina Ortiz'), this.muted('181.50.2.3'), this.muted('08 Jul 15:02')],
            [this.strong('vacancies.status'), this.text('vacancies'), this.text('Northwind Corp'), this.muted('200.12.9.1'), this.muted('08 Jul 12:20')],
            [this.strong('promotions.checkout'), this.text('billing'), this.text('Orion Systems'), this.muted('201.8.4.7'), this.muted('07 Jul 19:55')],
            [this.strong('roles.assign'), this.text('rbac'), this.text('Emay Walter'), this.muted('190.24.11.8'), this.muted('07 Jul 09:31')],
          ],
        };
    }

    if (role === 'empresa') {
      if (view === 'vacantes')
        return {
          filters: ['Todas', 'Activas', 'Borradores', 'Cerradas'],
          columns: ['Vacante', 'Postulaciones', 'Estado', 'Promoción', 'Vence'],
          rows: [
            [this.strong('Frontend Engineer'), this.strong('84'), b('Activa', 'green'), b('Pro', 'brand'), this.muted('12 Ago')],
            [this.strong('Backend Engineer'), this.strong('71'), b('Activa', 'green'), b('Sin promoción', 'gray'), this.muted('22 Ago')],
            [this.strong('Product Manager'), this.strong('52'), b('Activa', 'green'), b('Premium', 'gold'), this.muted('20 Ago')],
            [this.strong('UX Designer'), this.strong('46'), b('Activa', 'green'), b('Sin promoción', 'gray'), this.muted('25 Ago')],
            [this.strong('QA Engineer'), this.strong('31'), b('Pausada', 'amber'), b('Sin promoción', 'gray'), this.muted('—')],
            [this.strong('Data Analyst'), this.strong('0'), b('Borrador', 'gray'), b('Sin promoción', 'gray'), this.muted('—')],
          ],
        };
      if (view === 'postulaciones')
        return {
          filters: ['Todos', 'Nuevos', 'Preseleccionados', 'Entrevista', 'Oferta'],
          columns: ['Candidato', 'Vacante', 'Match', 'Etapa', 'Fecha'],
          rows: [
            [a('María Ferreira', 'MF', 0, 'Bogotá, CO'), this.text('Frontend Engineer'), this.progress(94), b('Entrevista', 'amber'), this.muted('hoy')],
            [a('Diego Salcedo', 'DS', 1, 'Lima, PE'), this.text('Backend Engineer'), this.progress(88), b('Preseleccionado', 'blue'), this.muted('ayer')],
            [a('Ana Ríos', 'AR', 4, 'CDMX, MX'), this.text('Product Manager'), this.progress(81), b('Oferta', 'brand'), this.muted('2 días')],
            [a('Bruno Costa', 'BC', 2, 'São Paulo, BR'), this.text('UX Designer'), this.progress(76), b('Postulado', 'gray'), this.muted('3 días')],
            [a('Lucía Mena', 'LM', 3, 'Santiago, CL'), this.text('QA Engineer'), this.progress(69), b('Postulado', 'gray'), this.muted('4 días')],
            [a('Pablo Vidal', 'PV', 5, 'Quito, EC'), this.text('Backend Engineer'), this.progress(73), b('Preseleccionado', 'blue'), this.muted('5 días')],
          ],
        };
      if (view === 'candidatos')
        return {
          title: 'Banco de candidatos',
          filters: ['Todos', 'Perfil público', 'Postularon'],
          columns: ['Candidato', 'Cargo', 'Ciudad', 'Match', 'Hoja de vida'],
          rows: [
            [a('María Ferreira', 'MF', 0), this.text('Frontend Sr.'), this.text('Bogotá, CO'), this.progress(94), b('Disponible', 'green')],
            [a('Diego Salcedo', 'DS', 1), this.text('Backend Sr.'), this.text('Lima, PE'), this.progress(88), b('Disponible', 'green')],
            [a('Perfil privado', '·', 3, 'postuló a tu vacante'), this.text('Product Manager'), this.text('CDMX, MX'), this.progress(81), b('Disponible', 'green')],
            [a('Perfil privado', '·', 5, 'sin postulación'), this.text('UX Designer'), this.text('Santiago, CL'), this.progress(76), b('Bloqueado', 'gray')],
            [a('Pablo Vidal', 'PV', 2), this.text('Backend Sr.'), this.text('Quito, EC'), this.progress(73), b('Disponible', 'green')],
          ],
        };
      if (view === 'equipo')
        return {
          title: 'Usuarios de la empresa',
          columns: ['Usuario', 'Rol interno', 'Correo', 'Estado'],
          rows: [
            [a('Carla Núñez', 'CN', 0), b('OWNER', 'brand'), this.text('carla@northwind.co'), b('Activo', 'green')],
            [a('Hugo Prieto', 'HP', 1), b('ADMIN', 'blue'), this.text('hugo@northwind.co'), b('Activo', 'green')],
            [a('Sofía Lara', 'SL', 4), b('ADMIN', 'blue'), this.text('sofia@northwind.co'), b('Invitada', 'amber')],
          ],
        };
      if (view === 'perfil')
        return {
          title: 'Datos de la empresa',
          columns: ['Campo', 'Valor'],
          rows: [
            [this.muted('Razón social'), this.strong('Northwind Corp S.A.S.')],
            [this.muted('NIT (solo lectura)'), this.text('900.123.456-7')],
            [this.muted('Sector'), this.text('Tecnología')],
            [this.muted('Tamaño'), this.text('120–250 empleados')],
            [this.muted('Ubicación'), this.text('Bogotá, Colombia')],
            [this.muted('Sitio web'), this.text('northwind.example.com')],
            [this.muted('Año de fundación'), this.text('2016')],
          ],
        };
    }

    if (role === 'postulante') {
      if (view === 'postulaciones')
        return {
          filters: ['Todas', 'En revisión', 'Entrevista', 'Oferta'],
          columns: ['Vacante', 'Empresa', 'Estado', 'Postulado'],
          rows: [
            [this.strong('Frontend Engineer'), this.text('Northwind Corp'), b('En entrevista', 'amber'), this.muted('hace 2 días')],
            [this.strong('Product Designer'), this.text('Lumen Studio'), b('En revisión', 'blue'), this.muted('hace 5 días')],
            [this.strong('UI Engineer'), this.text('Vela Retail'), b('Oferta recibida', 'green'), this.muted('hace 1 sem')],
            [this.strong('QA Analyst'), this.text('Aster Health'), b('Enviada', 'gray'), this.muted('hace 2 sem')],
            [this.strong('Data Analyst'), this.text('Orion Systems'), b('No seleccionado', 'red'), this.muted('hace 3 sem')],
          ],
        };
      if (view === 'perfil')
        return {
          title: 'Mi información',
          columns: ['Campo', 'Valor'],
          rows: [
            [this.muted('Nombre'), this.strong('María Ferreira')],
            [this.muted('Documento (solo lectura)'), this.text('CC 1.020.998.771')],
            [this.muted('Cargo buscado'), this.text('Frontend Engineer Sr.')],
            [this.muted('Ubicación'), this.text('Bogotá, Colombia')],
            [this.muted('Experiencia'), this.text('6 años')],
            [this.muted('Idiomas'), this.text('Español (nativo), Inglés (B2)')],
            [this.muted('Habilidades'), this.text('React · TypeScript · UI')],
          ],
        };
      if (view === 'cv')
        return {
          title: 'Mis hojas de vida',
          columns: ['Archivo', 'Tamaño', 'Subida', 'Estado'],
          rows: [
            [this.strong('CV_MariaFerreira_2026.pdf'), this.text('1.2 MB'), this.muted('02 Jul 2026'), b('Principal', 'green')],
            [this.strong('CV_Frontend_EN.pdf'), this.text('0.9 MB'), this.muted('10 Jun 2026'), b('Guardada', 'gray')],
            [this.strong('CV_2025.pdf'), this.text('1.0 MB'), this.muted('18 Dic 2025'), b('Guardada', 'gray')],
          ],
        };
    }

    return null;
  }

  /** Chips de filtro (solo visuales) para las vistas de búsqueda de empleo. */
  jobFilters(): readonly string[] {
    return ['Todos', 'Remoto', 'Híbrido', 'Tecnología', 'Diseño'];
  }
}
