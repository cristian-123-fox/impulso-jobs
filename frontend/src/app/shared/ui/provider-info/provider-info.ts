import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LEGAL_IDENTITY,
  LegalDocCode,
  legalDocument,
} from '@/shared/catalogs/legal.catalogs';

/**
 * Información precontractual del proveedor (arts. 7 BIS y 76 Bis fr. III LFPC).
 *
 * Antes de pagar, el consumidor tiene que ver quién cobra, su RFC, domicilio,
 * teléfono y correo de reclamaciones, y el total con impuestos. Se muestra en
 * los dos formularios de compra —promoción y suscripción— desde un solo
 * componente para que no se desincronicen.
 *
 * No inyecta servicios de datos: todo sale del catálogo legal, que es el mismo
 * que alimenta el aviso de privacidad y los términos.
 */
@Component({
  selector: 'ij-provider-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink],
  template: `
    <section
      class="mt-4 rounded-xl border border-line bg-white px-4 py-3.5 text-[12px] leading-relaxed text-body"
      aria-label="Datos del proveedor"
    >
      <p class="font-bold text-ink-900">Datos del proveedor</p>
      <p class="mt-1">
        {{ identity.legalName }} · RFC {{ identity.rfc }}
      </p>
      <p>{{ identity.fiscalAddress }}</p>
      <p>
        Tel. {{ identity.consumerPhone }} ·
        <a
          [href]="'mailto:' + identity.consumerEmail"
          class="font-medium text-brand-strong hover:underline"
          >{{ identity.consumerEmail }}</a
        >
      </p>

      @if (total() > 0) {
        <p class="mt-2">
          Total con IVA incluido:
          <strong class="text-ink-900">{{
            total() | currency: currency() : 'symbol-narrow' : '1.2-2'
          }}</strong>
          {{ currency() }}
        </p>
      }

      <p class="mt-1 text-muted">
        Al continuar aceptas los
        <a
          [routerLink]="termsRoute"
          target="_blank" rel="noopener"
          class="font-medium text-brand-strong hover:underline"
          >Términos y condiciones</a
        >, el
        <a
          [routerLink]="privacyRoute"
          target="_blank" rel="noopener"
          class="font-medium text-brand-strong hover:underline"
          >Aviso de privacidad</a
        >
        y la
        <a
          [routerLink]="refundRoute"
          target="_blank" rel="noopener"
          class="font-medium text-brand-strong hover:underline"
          >Política de reembolso</a
        >.
      </p>
    </section>
  `,
})
export class IjProviderInfo {
  readonly total = input(0);
  readonly currency = input('MXN');

  protected readonly identity = LEGAL_IDENTITY;
  protected readonly termsRoute = legalDocument(LegalDocCode.TERMS).route;
  protected readonly privacyRoute = legalDocument(LegalDocCode.PRIVACY).route;
  protected readonly refundRoute = legalDocument(LegalDocCode.REFUND).route;
}
