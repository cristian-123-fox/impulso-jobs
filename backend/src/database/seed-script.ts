import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { AppDataSource } from './typeorm.config';

/**
 * Una semilla: recibe la conexión **ya abierta** y devuelve una línea de
 * resumen. Ni abre ni cierra la conexión — de eso se encargan quien la invoca
 * (`runSeedScript` para el comando individual, `seed.ts` para el orquestador),
 * y así las seis pueden compartir una sola conexión en `pnpm seed`.
 */
export type SeedFn = (dataSource: DataSource) => Promise<string>;

/**
 * Punto de entrada de un seeder suelto (`pnpm seed:rbac`, `seed:admin`, …).
 * Abre la conexión, ejecuta y cierra. Se conserva por compatibilidad: el
 * despliegue documentado y los `:prod` siguen llamando a los scripts uno a uno.
 *
 * Para correrlos todos de una vez está `pnpm seed` (`seed.ts`).
 */
export async function runSeedScript(seed: SeedFn): Promise<void> {
  await AppDataSource.initialize();
  try {
    console.log(await seed(AppDataSource));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}
