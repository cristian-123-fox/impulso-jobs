import type { DataSource } from 'typeorm';
import { LegalConsent } from '@/modules/legal/entities/legal-consent.entity';
import { LegalDocument } from '@/modules/legal/entities/legal-document.entity';
import {
  ConsentMethod,
  ConsentSource,
  LegalDocumentCode,
} from '@/modules/legal/enums/legal.enums';

/**
 * Consentimiento de una cuenta creada por un seeder.
 *
 * ## Por qué hace falta
 *
 * El login exige la versión vigente de los documentos obligatorios, y una cuenta
 * sembrada no la trae. Sin esto, `sebadmin@test.com` y las cuentas de
 * `pnpm seed:demo` se quedan fuera de su propia aplicación: el seed produce
 * cuentas que por la vía real nunca existirían.
 *
 * ## Por qué no es «rellenar un hueco»
 *
 * Una cuenta sembrada simula una que se dio de alta por la aplicación, y esa
 * alta sí habría dejado constancia. Grabar aquí lo mismo que grabaría el alta no
 * inventa nada.
 *
 * Esto **no** aplica a las cuentas reales anteriores al módulo legal. Esas no se
 * tocan a mano: no se puede dar por aceptado lo que nadie aceptó. Lo correcto es
 * que la persona lo acepte en su próximo login, que es lo que hace la puerta de
 * re-consentimiento. Rellenar sus filas a mano sería fabricar consentimiento.
 *
 * Idempotente: si ya hay una aceptación vigente de la versión en curso, no
 * escribe nada, para que `pnpm seed` se pueda repetir sin duplicar filas.
 */
export async function seedAccountConsents(
  dataSource: DataSource,
  user: { id: string; email: string },
): Promise<number> {
  const documentRepo = dataSource.getRepository(LegalDocument);
  const consentRepo = dataSource.getRepository(LegalConsent);

  const required = await documentRepo.find({
    where: { isCurrent: true, blocksRegistration: true },
  });

  if (required.length === 0) {
    console.warn(
      '⚠ No hay documentos legales vigentes: la cuenta se creará sin constancia ' +
        'de consentimiento y no podrá entrar. Ejecuta las migraciones.',
    );
    return 0;
  }

  let written = 0;

  for (const document of required) {
    const latest = await consentRepo.findOne({
      where: { userId: user.id, documentCode: document.code },
      order: { createdAt: 'DESC' },
    });

    if (
      latest?.granted === true &&
      latest.documentVersion === document.version
    ) {
      continue;
    }

    const consent = new LegalConsent();
    consent.userId = user.id;
    consent.subjectEmail = user.email;
    consent.documentCode = document.code;
    consent.documentVersion = document.version;
    consent.granted = true;
    consent.consentMethod = ConsentMethod.EXPRESS_CHECKBOX;
    consent.source = ConsentSource.REGISTRATION;
    consent.metadata = { documentCode: document.code, seeded: true };

    await consentRepo.save(consent);
    written += 1;
  }

  return written;
}

/** Códigos que el gate de re-consentimiento exige siempre. */
export const REQUIRED_CONSENT_CODES: readonly LegalDocumentCode[] = [
  LegalDocumentCode.TERMS,
  LegalDocumentCode.PRIVACY,
];
