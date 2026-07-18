import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { RegistrationModule } from '@/modules/iam/registration/registration.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    AuthModule,
    PermissionsModule,
    RolesModule,
    RegistrationModule,
    CandidatesModule,
    CompaniesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
