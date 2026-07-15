import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import {
  PERMISSION_REPOSITORY,
  type IPermissionRepository,
} from '@/modules/iam/permissions/repositories/permission.repository.interface';
import { PermissionResponseDto } from '@/modules/iam/permissions/dto/permission-response.dto';
import { toPermissionResponse } from '@/modules/iam/permissions/dto/permission.mapper';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: IPermissionRepository,
  ) {}

  @Get()
  @RequirePermissions('roles.read')
  @ResponseMessage('Permisos obtenidos.')
  @ApiOkResponse({ type: [PermissionResponseDto] })
  async list(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissions.findAll();
    return permissions.map(toPermissionResponse);
  }
}
