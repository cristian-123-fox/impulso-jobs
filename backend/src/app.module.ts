import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { RegistrationModule } from '@/modules/iam/registration/registration.module';
import { AdminUsersModule } from '@/modules/iam/users/admin-users.module';
import { AccountModule } from '@/modules/iam/account/account.module';
import { ApplicationsModule } from '@/modules/applications/applications.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { TalentModule } from '@/modules/talent/talent.module';
import { VacanciesModule } from '@/modules/vacancies/vacancies.module';

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
    VacanciesModule,
    ApplicationsModule,
    TalentModule,
    AccountModule,
    AdminUsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
