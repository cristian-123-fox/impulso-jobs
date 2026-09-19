import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
async function main() {
  await AppDataSource.initialize();
  // Sin variables intermedias: `query()` devuelve `any` y asignarlo rompe
  // `no-unsafe-assignment` (y el `--fix` de eslint se lleva por delante
  // cualquier aserción de tipo que se le ponga delante).
  console.log(
    'companies:',
    JSON.stringify(
      await AppDataSource.query('SELECT id, logo_url FROM companies'),
    ),
  );
  console.log(
    'profiles:',
    JSON.stringify(
      await AppDataSource.query(
        'SELECT id, profile_photo_url FROM candidate_profiles',
      ),
    ),
  );
  await AppDataSource.destroy();
}
void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
