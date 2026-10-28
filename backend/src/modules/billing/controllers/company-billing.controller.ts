import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ClientInfo,
  type ClientInfoPayload,
} from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  CheckoutResponseDto,
  OrderResponseDto,
  PromotionResponseDto,
  SubscriptionResponseDto,
} from '@/modules/billing/dto/billing-response.dto';
import { PaymentProvider } from '@/modules/billing/enums/billing.enums';
import {
  CreatePromotionDto,
  CreateSubscriptionDto,
  ListPromotionsQueryDto,
  StartCheckoutDto,
} from '@/modules/billing/dto/billing.dto';
import { CompanyPaymentsUseCase } from '@/modules/billing/use-cases/company-payments.use-case';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { CompanySubscriptionUseCase } from '@/modules/billing/use-cases/company-subscription.use-case';
import { BillingActor } from '@/modules/billing/use-cases/plan-catalog.use-case';
import { VacancyPromotionUseCase } from '@/modules/billing/use-cases/vacancy-promotion.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';

/** Compra de planes por parte de la empresa: promociones y suscripción. */
@ApiTags('company-billing')
@ApiBearerAuth()
@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyBillingController {
  constructor(
    private readonly promotions: VacancyPromotionUseCase,
    private readonly subscriptions: CompanySubscriptionUseCase,
    private readonly payments: CompanyPaymentsUseCase,
  ) {}

  @Post('vacancies/:id/promotions')
  @RequirePermissions('promotions.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Promoción creada. Pendiente de pago.')
  createPromotion(
    @Param('id') vacancyId: string,
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PromotionResponseDto> {
    return this.promotions.create(
      vacancyId,
      dto.planId,
      dto.useSubscriptionCredit ?? false,
      this.actor(user, client),
    );
  }

  @Get('vacancies/:id/promotion')
  @RequirePermissions('promotions.read')
  @ResponseMessage('Promoción obtenida.')
  getVacancyPromotion(
    @Param('id') vacancyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PromotionResponseDto | null> {
    return this.promotions.getForVacancy(vacancyId, this.actor(user, client));
  }

  @Get('promotions')
  @RequirePermissions('promotions.read')
  @ResponseMessage('Promociones obtenidas.')
  listPromotions(
    @Query() query: ListPromotionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PaginatedResponse<PromotionResponseDto>> {
    return this.promotions.list(
      this.actor(user, client),
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Get('promotions/summary')
  @RequirePermissions('promotions.read')
  @ResponseMessage('Resumen de promociones obtenido.')
  promotionsSummary(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<any> {
    return this.promotions.summary(this.actor(user, client));
  }

  @Get('promotions/eligible-vacancies')
  @RequirePermissions('promotions.read')
  @ResponseMessage('Vacantes elegibles obtenidas.')
  eligibleVacancies(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<any[]> {
    return this.promotions.eligibleVacancies(this.actor(user, client));
  }

  @Get('promotions/:id')
  @RequirePermissions('promotions.read')
  @ResponseMessage('Promoción obtenida.')
  getPromotion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<any> {
    return this.promotions.getById(id, this.actor(user, client));
  }

  @Post('promotions')
  @RequirePermissions('promotions.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Promoción creada.')
  createPromotionFromBody(
    @Body() dto: CreatePromotionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<PromotionResponseDto> {
    if (!dto.vacancyId) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.PROMOTION_NOT_FOUND,
        'Debes indicar la vacante a promocionar.',
      );
    }
    return this.promotions.create(
      dto.vacancyId,
      dto.planId,
      dto.useSubscriptionCredit ?? false,
      this.actor(user, client),
    );
  }

  @Post('promotions/:id/checkout')
  @RequirePermissions('promotions.checkout')
  @ResponseMessage('Cobro iniciado.')
  checkout(
    @Param('id') promotionId: string,
    @Body() dto: StartCheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CheckoutResponseDto> {
    return this.promotions.checkout(
      promotionId,
      dto.method,
      dto.installments ?? 1,
      dto.provider ?? PaymentProvider.MANUAL,
      this.actor(user, client),
    );
  }

  @Post('subscriptions')
  @RequirePermissions('subscriptions.create')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Suscripción creada. Pendiente de pago.')
  createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CheckoutResponseDto> {
    return this.subscriptions.create(
      dto.planId,
      dto.method,
      dto.provider ?? PaymentProvider.MANUAL,
      this.actor(user, client),
    );
  }

  /**
   * Retira un cobro abierto propio: al volver cancelado del Checkout de
   * Stripe, o para anular una solicitud de pago. Libera la reserva.
   *
   * Se exige `promotions.checkout` también para órdenes de suscripción: es el
   * permiso de "abrir un cobro", y quien puede abrirlo puede retirarlo.
   */
  @Post('payments/:orderId/cancel')
  @RequirePermissions('promotions.checkout')
  @ResponseMessage('Pago cancelado.')
  cancelPayment(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<OrderResponseDto> {
    return this.payments.cancel(orderId, this.actor(user, client));
  }

  @Get('subscriptions/current')
  @RequirePermissions('subscriptions.read')
  @ResponseMessage('Suscripción obtenida.')
  currentSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SubscriptionResponseDto | null> {
    return this.subscriptions.current(this.actor(user, client));
  }

  /** Cancela la renovación; el periodo ya pagado se respeta. */
  @Delete('subscriptions/renewal')
  @RequirePermissions('subscriptions.manage')
  @ResponseMessage('Renovación automática cancelada.')
  cancelRenewal(
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.cancelRenewal(this.actor(user, client));
  }

  private actor(
    user: AuthenticatedUser,
    client: ClientInfoPayload,
  ): BillingActor {
    return { userId: user.userId, ip: client.ip, userAgent: client.userAgent };
  }
}
