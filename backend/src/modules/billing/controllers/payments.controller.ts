import { randomUUID } from 'node:crypto';
import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ConfirmPaymentDto } from '@/modules/billing/dto/billing.dto';
import { PaymentStatus } from '@/modules/billing/enums/billing.enums';
import {
  type PaymentProviderPort,
  PAYMENT_PROVIDER,
} from '@/modules/billing/services/payment-provider.port';
import {
  SettlementResult,
  SettlePaymentUseCase,
} from '@/modules/billing/use-cases/settle-payment.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

/**
 * Confirmación de cobros.
 *
 * Mientras no exista la pasarela, un administrador confirma a mano el pago que
 * el adaptador manual dejó pendiente. Cuando se conecte Stripe, su webhook
 * (`POST /payments/stripe/webhook`, sin guard y con raw body) construirá el
 * mismo `PaymentEvent` y llamará a `SettlePaymentUseCase`: la lógica de
 * activación y la idempotencia ya están, no cambian.
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly settle: SettlePaymentUseCase,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
  ) {}

  @Post('confirm')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
