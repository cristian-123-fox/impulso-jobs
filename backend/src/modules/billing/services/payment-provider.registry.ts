import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import {
  PaymentMethod,
  PaymentProvider,
} from '@/modules/billing/enums/billing.enums';
import { ManualPaymentAdapter } from '@/modules/billing/services/manual-payment.adapter';
import { PaymentProviderPort } from '@/modules/billing/services/payment-provider.port';
import { StripePaymentAdapter } from '@/modules/billing/services/stripe-payment.adapter';

/** `provider` de la orden es un `varchar`: se compara contra el valor. */
const STRIPE: string = PaymentProvider.STRIPE;

/** Lo que el frontend necesita para pintar la elección de pago. */
export interface PaymentProviderOption {
  provider: PaymentProvider;
  /** Métodos para una compra de pago único (promoción de vacante). */
  methods: PaymentMethod[];
  /** Métodos para una suscripción recurrente. */
  recurringMethods: PaymentMethod[];
}

/**
 * Los proveedores de pago que conviven en la plataforma.
 *
 * Antes había uno solo, elegido en el binding del módulo; ahora la empresa
 * escoge en cada compra entre la solicitud de pago y Stripe, y **cada orden
 * guarda el suyo** (`promotion_orders.provider`). Cualquier operación posterior
 * —cancelar, consultar, liquidar el webhook— se hace contra el de la orden, no
 * contra "el configurado".
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: ReadonlyMap<string, PaymentProviderPort>;

  constructor(manual: ManualPaymentAdapter, stripe: StripePaymentAdapter) {
    this.providers = new Map<string, PaymentProviderPort>([
      [manual.name, manual],
      [stripe.name, stripe],
    ]);
  }

  /** El proveedor pedido, si existe y está configurado. */
  require(name: string): PaymentProviderPort {
    const provider = this.providers.get(name);
    if (!provider || !provider.enabled) {
      throw new AppException(
        HttpStatus.CONFLICT,
        ErrorCode.PAYMENT_PROVIDER_NOT_AVAILABLE,
        name === STRIPE
          ? 'El pago en línea no está disponible en este momento; puedes enviar una solicitud de pago.'
          : 'Ese medio de pago no está disponible.',
      );
    }
    return provider;
  }

  /**
   * El proveedor que procesó una orden, aunque hoy esté deshabilitado: para
   * cancelar o consultar lo que ya existe no se exige que siga configurado.
   */
  forOrder(name: string): PaymentProviderPort | null {
    return this.providers.get(name) ?? null;
  }

  /** Proveedores configurados, con sus métodos. */
  options(): PaymentProviderOption[] {
    return [...this.providers.values()]
      .filter((provider) => provider.enabled)
      .map((provider) => ({
        provider: provider.name,
        methods: provider.supportedMethods(false),
        recurringMethods: provider.supportedMethods(true),
      }));
  }

  /** Error estándar cuando el proveedor no cobra ese método. */
  assertSupports(
    provider: PaymentProviderPort,
    method: PaymentMethod,
    recurring: boolean,
  ): void {
    if (provider.supportedMethods(recurring).includes(method)) return;
    throw new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE,
      provider.name === PaymentProvider.STRIPE
        ? 'Ese método no se puede pagar en línea; elige otro o envía una solicitud de pago.'
        : 'Ese método no está disponible para una solicitud de pago.',
    );
  }
}
