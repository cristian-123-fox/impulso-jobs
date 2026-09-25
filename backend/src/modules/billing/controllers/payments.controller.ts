import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  type RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { Role } from '@/common/types/role.enum';
import { ConfirmPaymentDto } from '@/modules/billing/dto/billing.dto';
import { PaymentStatus } from '@/modules/billing/enums/billing.enums';
import {
  type PaymentProviderPort,
  PAYMENT_PROVIDER,
} from '@/modules/billing/services/payment-provider.port';
import {
  PaymentProviderOption,
  PaymentProviderRegistry,
} from '@/modules/billing/services/payment-provider.registry';
import {
  HandlePaymentWebhookUseCase,
  WebhookAck,
} from '@/modules/billing/use-cases/handle-payment-webhook.use-case';
import {
  SettlementResult,
  SettlePaymentUseCase,
} from '@/modules/billing/use-cases/settle-payment.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { RolesGuard } from '@/modules/iam/permissions/guards/roles.guard';

/**
 * Confirmación de cobros.
 *
 * Dos entradas al mismo `SettlePaymentUseCase`: el webhook de la pasarela
 * (`POST /payments/stripe/webhook`, sin guard y con raw body) y la
 * confirmación manual de una solicitud de pago.
 *
 * Desde el back-office se confirma por `/admin/payments/:id/confirm`, que
 * trabaja con el id de la orden; esta ruta queda para scripts y pruebas que
 * sólo conocen la referencia externa.
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly settle: SettlePaymentUseCase,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
    private readonly registry: PaymentProviderRegistry,
    private readonly webhooks: HandlePaymentWebhookUseCase,
  ) {}

  /**
   * Medios de pago disponibles y los métodos de cada uno. Público, como el
   * catálogo de planes: el formulario de compra sólo ofrece "pagar en línea"
   * si Stripe está configurado en este entorno.
   */
  @Get('options')
  @ResponseMessage('Medios de pago obtenidos.')
  options(): PaymentProviderOption[] {
    return this.registry.options();
  }

  /**
   * Webhook de la pasarela. **Sin guard**: lo que lo protege es la firma, que
   * el adaptador verifica sobre el cuerpo crudo (`rawBody: true` en
   * `main.ts`). Hoy sólo `stripe`; la URL a registrar en el dashboard es
   * `<API>/api/v1/payments/stripe/webhook`.
   */
  @Post(':provider/webhook')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Webhook recibido.')
  webhook(
    @Param('provider') provider: string,
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<WebhookAck> {
    return this.webhooks.handle(provider, request.rawBody, signature);
  }

  @Post('confirm')
  @RequireRoles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @RequirePermissions('plans.manage')
  @ResponseMessage('Pago aplicado.')
  confirm(@Body() dto: ConfirmPaymentDto): Promise<SettlementResult> {
    const succeeded = dto.succeeded ?? true;
    return this.settle.execute({
      provider: this.payments.name,
      // Sin id explícito se genera uno: cada confirmación manual es un evento
      // distinto, pero repetir el mismo id sí queda descartado por idempotencia.
      eventId: dto.eventId ?? randomUUID(),
      type: succeeded ? 'payment.succeeded' : 'payment.failed',
      externalReference: dto.externalReference,
      status: succeeded ? PaymentStatus.PAID : PaymentStatus.FAILED,
    });
  }
}
