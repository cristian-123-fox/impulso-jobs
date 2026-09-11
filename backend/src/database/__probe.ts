import 'reflect-metadata';
import { AppDataSource } from './typeorm.config';
async function main() {
  await AppDataSource.initialize();
  const c = await AppDataSource.query('SELECT id, logo_url FROM companies');
  const p = await AppDataSource.query(
    'SELECT id, profile_photo_url FROM candidate_profiles',
  );
  console.log('companies:', JSON.stringify(c));
  console.log('profiles:', JSON.stringify(p));
  await AppDataSource.destroy();
}
void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
