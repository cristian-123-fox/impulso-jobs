import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSourceOptions, DataSource } from 'typeorm';

dotenvConfig({ path: '.env' });

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

type SupportedDbType = 'postgres' | 'mysql';

const dbType = (process.env.DB_TYPE ?? 'postgres') as SupportedDbType;

if (dbType !== 'postgres' && dbType !== 'mysql') {
  throw new Error(
    `Unsupported DB_TYPE "${dbType as string}". Use "postgres" or "mysql".`,
  );
}

const defaultPort = dbType === 'mysql' ? 3306 : 5432;

const dataSourceOptions: DataSourceOptions = {
  type: dbType,
  host: getEnv('DB_HOST'),
  port: parseInt(process.env.DB_PORT ?? String(defaultPort), 10),
  username: getEnv('DB_USERNAME'),
  password: getEnv('DB_PASSWORD'),
  database: getEnv('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  migrationsRun: false,
};

export default registerAs('typeorm', () => dataSourceOptions);
export const AppDataSource = new DataSource(dataSourceOptions);
