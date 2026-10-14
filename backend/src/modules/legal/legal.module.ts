import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/iam/auth/auth.module';
import { PermissionsModule } from '@/modules/iam/permissions/permissions.module';
import { AdminLegalController } from '@/modules/legal/controllers/admin-legal.controller';
import { LegalController } from '@/modules/legal/controllers/legal.controller';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import { LEGAL_CONSENT_REPOSITORY } from '@/modules/legal/repositories/legal-consent.repository.interface';
import { LegalConsentRepository } from '@/modules/legal/repositories/legal-consent.repository';
import { LEGAL_DOCUMENT_REPOSITORY } from '@/modules/legal/repositories/legal-document.repository.interface';
import { LegalDocumentRepository } from '@/modules/legal/repositories/legal-document.repository';
import { GetLegalDocumentsUseCase } from '@/modules/legal/use-cases/get-legal-documents.use-case';
import { LegalReconsentService } from '@/modules/legal/services/legal-reconsent.service';
import { ListConsentsUseCase } from '@/modules/legal/use-cases/list-consents.use-case';
import { ListMyConsentsUseCase } from '@/modules/legal/use-cases/list-my-consents.use-case';
import { RecordConsentUseCase } from '@/modules/legal/use-cases/record-consent.use-case';
import { WithdrawConsentUseCase } from '@/modules/legal/use-cases/withdraw-consent.use-case';

/**
 * Cumplimiento legal: documentos versionados y constancia de qué aceptó cada
 * persona, cuándo y desde dónde.
 *
 * Importa `AuthModule` por los guards, y `PermissionsModule` por
 * `PermissionsGuard`: **no es opcional**. `AdminLegalController` lo usa, y
 * `PermissionsGuard` necesita `PermissionsService` inyectado, así que sin este
 * import el arranque falla con `UnknownDependenciesException` aunque el módulo
 * compile sin complaints y todos los tests unitarios pasen.
 *
 * Los repos van por token, como en el resto del repo, para que los use-cases se
 * prueben sin base de datos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LegalDocument, LegalConsent]),
    // forwardRef por el ciclo con AuthModule, que importa este módulo para el
    // re-consentimiento. Necesario para poder iniciar sesión.
    forwardRef(() => AuthModule),
    AuditModule,
    forwardRef(() => PermissionsModule),
  ],
  controllers: [LegalController, AdminLegalController],
  providers: [
    { provide: LEGAL_DOCUMENT_REPOSITORY, useClass: LegalDocumentRepository },
    { provide: LEGAL_CONSENT_REPOSITORY, useClass: LegalConsentRepository },
    GetLegalDocumentsUseCase,
    RecordConsentUseCase,
    ListMyConsentsUseCase,
    ListConsentsUseCase,
    WithdrawConsentUseCase,
    LegalReconsentService,
  ],
  exports: [
    RecordConsentUseCase,
    LegalReconsentService,
    LEGAL_DOCUMENT_REPOSITORY,
  ],
})
export class LegalModule {}
