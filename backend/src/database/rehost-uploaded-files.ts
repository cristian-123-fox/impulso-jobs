import 'reflect-metadata';
import {
  EntityTarget,
  FindOptionsWhere,
  IsNull,
  Not,
  ObjectLiteral,
} from 'typeorm';
import { AppDataSource } from './typeorm.config';
import { CandidateProfile } from '@/modules/candidates/entities/candidate-profile.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { Vacancy } from '@/modules/vacancies/entities/vacancy.entity';
import {
  rehostUploadedFileUrl,
  resolveAppPublicUrl,
} from '@/common/storage/public-base-url';

/**
 * Backfill de T23: las URLs de los archivos subidos se guardan **absolutas** en
 * BD —logo de empresa, foto del candidato e imagen de vacante (T24)—, así que
 * las filas escritas mientras `APP_PUBLIC_URL` no estaba definida quedaron con
 * `http://localhost:3000/uploads/...` y la imagen se ve rota.
 * Definir la variable arregla las subidas nuevas, no las viejas: esto las
 * reescribe al host actual.
 *
 * Sirve igual el día que cambie el dominio del API.
 *
 *   pnpm uploads:rehost                        # simulación (no escribe nada)
 *   pnpm uploads:rehost -- --confirm           # aplica
 *   pnpm uploads:rehost -- --from=http://localhost:3000 --confirm
 *
 * `--from` acota a las URLs de ese origen: útil si alguna fila tiene una URL
 * externa legítima (el perfil admite pegar una URL de logo a mano).
 *
 * Sólo toca lo que el propio backend subió (`/uploads/<carpeta>/<uuid>.<ext>`);
 * las URLs externas y los CV (`file_url` es una ruta de API, no un archivo
 * público) se quedan como están. **No mueve archivos de disco.**
 */

interface RehostTarget<T extends ObjectLiteral> {
  label: string;
  entity: EntityTarget<T>;
  /**
   * Filtro en BD para traer sólo las filas que pueden tener algo que
   * reescribir. Importa desde que entró `vacancies`: es la primera tabla de la
   * lista que puede ser grande, y sin esto el script se traía el catálogo
   * entero a memoria.
   */
  where: FindOptionsWhere<T>;
  read: (row: T) => string | null | undefined;
  write: (row: T, url: string) => void;
  describe: (row: T) => string;
}

const TARGETS = [
  {
    label: 'companies.logo_url',
    entity: Company,
    where: { logoUrl: Not(IsNull()) },
    read: (row: Company) => row.logoUrl,
    write: (row: Company, url: string) => {
      row.logoUrl = url;
    },
    describe: (row: Company) => row.legalName ?? row.id,
  } satisfies RehostTarget<Company>,
  {
    label: 'candidate_profiles.profile_photo_url',
    entity: CandidateProfile,
    where: { profilePhotoUrl: Not(IsNull()) },
    read: (row: CandidateProfile) => row.profilePhotoUrl,
    write: (row: CandidateProfile, url: string) => {
      row.profilePhotoUrl = url;
    },
    describe: (row: CandidateProfile) => `${row.firstName} ${row.lastName}`,
  } satisfies RehostTarget<CandidateProfile>,
  {
    label: 'vacancies.image_url',
    entity: Vacancy,
    where: { imageUrl: Not(IsNull()) },
    read: (row: Vacancy) => row.imageUrl,
    write: (row: Vacancy, url: string) => {
      row.imageUrl = url;
    },
    describe: (row: Vacancy) => row.title ?? row.id,
  } satisfies RehostTarget<Vacancy>,
];

async function rehost<T extends ObjectLiteral>(
  target: RehostTarget<T>,
  baseUrl: string,
  from: string | null,
  confirmed: boolean,
): Promise<number> {
  const repo = AppDataSource.getRepository(target.entity);
  // El filtro va por propiedad de la entidad, no por SQL a mano: TypeORM lo
  // traduce a la columna de cada motor y sigue siendo portable MySQL/Postgres.
  const rows = await repo.find({ where: target.where, withDeleted: true });

  let changed = 0;
  for (const row of rows) {
    const current = target.read(row);
    if (from && !current?.startsWith(from)) continue;

    const rehosted = rehostUploadedFileUrl(current, baseUrl);
    if (!rehosted) continue;

    console.log(`  - ${target.describe(row)}`);
    console.log(`      ${current ?? ''}`);
    console.log(`   -> ${rehosted}`);
    changed += 1;

    if (confirmed) {
      target.write(row, rehosted);
      await repo.save(row);
    }
  }

  console.log(
    `${target.label}: ${changed} de ${rows.length} fila(s) con archivo ${confirmed ? 'reescrita(s)' : 'por reescribir'}.`,
  );
  return changed;
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes('--confirm');
  const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
  const from = fromArg
    ? fromArg.slice('--from='.length).replace(/\/+$/, '')
    : null;

  const baseUrl = resolveAppPublicUrl();
  console.log(`Host destino (APP_PUBLIC_URL): ${baseUrl}`);
  if (from) console.log(`Sólo URLs que empiezan por: ${from}`);

  await AppDataSource.initialize();
  try {
    let total = 0;
    for (const target of TARGETS) {
      total += await rehost(
        target as RehostTarget<ObjectLiteral>,
        baseUrl,
        from,
        confirmed,
      );
    }

    if (total === 0) {
      console.log('\nNada que reescribir: todas las URLs ya apuntan al host.');
      return;
    }
    console.log(
      confirmed
        ? `\n${total} URL(s) reescrita(s).`
        : '\nSIMULACIÓN: no se escribió nada. Repite con `--confirm` para aplicar.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
