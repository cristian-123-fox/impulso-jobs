import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { CandidatesModule } from '@/modules/candidates/candidates.module';
import { LegalModule } from '@/modules/legal/legal.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { RolesModule } from '@/modules/iam/roles/roles.module';
import { GoogleLoginController } from '@/modules/iam/social-login/controllers/google-login.controller';
import { GoogleTokenVerifier } from '@/modules/iam/social-login/services/google-token-verifier.service';
import { GoogleLoginUseCase } from '@/modules/iam/social-login/use-cases/google-login.use-case';
import { UsersModule } from '@/modules/iam/users/users.module';

/**
 * `POST /auth/google` (Google Identity Services).
 *
 * Módulo propio por el mismo motivo que `RegistrationModule`: necesita Roles y
 * Candidatos, y ambos pasan por Auth — importarlos desde `AuthModule` cerraría
 * el ciclo. De paso deja el login social al margen del HU-001, que ya tiene
 * sus reglas (bloqueo por intentos, verificación de correo).
 *
 * Importa `LegalModule` porque, igual que el registro, crea cuentas y por tanto
 * tiene que dejar constancia del consentimiento.
 */
@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    CandidatesModule,
    AuditModule,
    LegalModule,
  ],
  controllers: [GoogleLoginController],
  providers: [GoogleTokenVerifier, GoogleLoginUseCase],
})
export class SocialLoginModule {}
