import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
import type { SeedFn } from './seed-script';
import { seedAdmin } from './seed-admin';
import { seedApplicationStatuses } from './seed-application-statuses';
import { seedCandidate } from './seed-candidate';
import { seedCompany } from './seed-company';
import { seedPlanFeatures } from './seed-plan-features';
import { seedRbac } from './seed-rbac';

/**
 * Orquestador de semillas: **un solo comando** en lugar de seis.
 *
 *   pnpm seed              → catálogos + administrador (seguro en cualquier entorno)
 *   pnpm seed:demo         → lo anterior + cuentas de prueba (candidato y empresa)
 *   pnpm seed -- --only=rbac,admin
 *   pnpm seed -- --skip=plan-features
 *   pnpm seed -- --list
 *
 * Abre **una sola conexión** para todas (los scripts sueltos abrían y cerraban
 * una cada uno) y respeta el orden: RBAC primero, porque el resto necesita que
 * los roles existan.
 *
 * Todas las semillas son idempotentes: insertan lo que falta y actualizan lo que
 * ya está. Correr esto dos veces seguidas no duplica nada.
 *
 * ⚠️ **De aquí en adelante, los datos nuevos NO se añaden aquí sino en una
 * migración.** Ver `migrations/helpers/seed-data.helper.ts` y la sección
 * "Semillas y datos de catálogo" de CLAUDE.md: una migración corre sola en el
 * despliegue y deja constancia en la tabla `migrations`, mientras que un seeder
 * depende de que alguien se acuerde de ejecutarlo. Este orquestador existe para
 * las seis semillas que ya había, no para que crezca.
 */

type SeedGroup = 'core' | 'admin' | 'demo';

interface SeedEntry {
  /** Nombre para `--only` / `--skip`. Coincide con el script individual. */
  key: string;
  group: SeedGroup;
  description: string;
  run: SeedFn;
}

/** El orden importa: RBAC crea los roles que admin/candidate/company asignan. */
const SEEDS: readonly SeedEntry[] = [
  {
    key: 'rbac',
    group: 'core',
    description: 'Roles, permisos y matriz de acceso',
    run: seedRbac,
  },
  {
    key: 'applications',
    group: 'core',
    description: 'Catálogo de estados de postulación (M11)',
    run: seedApplicationStatuses,
  },
  {
    key: 'plan-features',
    group: 'core',
    description: 'Catálogo de beneficios de plan (M14)',
    run: seedPlanFeatures,
  },
  {
    key: 'admin',
    group: 'admin',
    description:
      'Usuario administrador (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)',
    run: seedAdmin,
  },
  {
    key: 'candidate',
    group: 'demo',
    description: 'Candidato de prueba',
    run: seedCandidate,
  },
  {
    key: 'company',
    group: 'demo',
    description: 'Empresa de prueba',
    run: seedCompany,
  },
];

interface Options {
  only: string[];
  skip: string[];
  demo: boolean;
  force: boolean;
  list: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const list = (flag: string): string[] => {
    const arg = argv.find((a) => a.startsWith(`${flag}=`));
    return arg
      ? arg
          .slice(flag.length + 1)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
  };

  return {
    only: list('--only'),
    skip: list('--skip'),
    demo: argv.includes('--demo'),
    force: argv.includes('--force'),
    list: argv.includes('--list'),
  };
}

function select(options: Options): SeedEntry[] {
  if (options.only.length > 0) {
    const unknown = options.only.filter(
      (key) => !SEEDS.some((s) => s.key === key),
    );
    if (unknown.length > 0) {
      throw new Error(
        `Semilla desconocida: ${unknown.join(', ')}. Disponibles: ${SEEDS.map((s) => s.key).join(', ')}.`,
      );
    }
    return SEEDS.filter((s) => options.only.includes(s.key));
  }

  // Por defecto: catálogos + admin. Las cuentas de prueba sólo con --demo,
  // para que `pnpm seed` se pueda correr en producción sin sembrar basura.
  return SEEDS.filter(
    (s) =>
      (s.group !== 'demo' || options.demo) && !options.skip.includes(s.key),
  );
}

function printList(): void {
  console.log('Semillas disponibles:\n');
  for (const seed of SEEDS) {
    const tag = seed.group === 'demo' ? ' (sólo con --demo)' : '';
    console.log(`  ${seed.key.padEnd(14)} ${seed.description}${tag}`);
  }
  console.log(
    '\nUso: pnpm seed [-- --demo] [-- --only=a,b] [-- --skip=a,b] [-- --list]',
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    printList();
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (options.demo && isProduction && !options.force) {
    throw new Error(
      'Las cuentas de prueba (--demo) no se siembran con NODE_ENV=production. ' +
        'Si de verdad las quieres ahí, añade --force.',
    );
  }

  const selected = select(options);
  if (selected.length === 0) {
    console.log('No hay nada que sembrar con esos filtros.');
    return;
  }

  await AppDataSource.initialize();
  const summaries: string[] = [];
  try {
    for (const [index, seed] of selected.entries()) {
      console.log(`\n[${index + 1}/${selected.length}] ${seed.key} …`);
      try {
        const summary = await seed.run(AppDataSource);
        summaries.push(`  ✔ ${summary}`);
      } catch (error) {
        // Se nombra la semilla que falló: con seis en cadena, el stack a secas
        // no dice cuál fue, y las siguientes ya no corren.
        console.error(`\n✖ Falló la semilla "${seed.key}".`);
        throw error;
      }
    }
  } finally {
    await AppDataSource.destroy();
  }

  console.log(`\nSemillas aplicadas (${selected.length}):`);
  for (const line of summaries) console.log(line);

  if (!options.demo && options.only.length === 0) {
    console.log(
      '\nLas cuentas de prueba (candidato/empresa) no se sembraron. Usa `pnpm seed:demo` si las necesitas.',
    );
  }
  console.log(
    'Si sembraste contra un servidor en marcha, reinicia el proceso: los permisos se cachean en memoria.',
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
