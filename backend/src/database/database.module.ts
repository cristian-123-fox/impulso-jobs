import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeOrmConfig from './typeorm.config';
import { DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forFeature(typeOrmConfig),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<DataSourceOptions>('typeorm')!,
    }),
  ],
})
export class DatabaseModule {}
