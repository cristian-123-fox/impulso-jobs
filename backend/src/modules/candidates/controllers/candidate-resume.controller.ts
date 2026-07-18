import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ClientInfo } from '@/common/decorators/client-info.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import type { ClientInfoPayload } from '@/common/decorators/client-info.decorator';
import {
  CandidateResumeResponseDto,
  toCandidateResumeResponse,
} from '@/modules/candidates/dto/candidate-resume.dto';
import {
  CandidateResumeUploadFile,
  CandidateResumeUseCase,
} from '@/modules/candidates/use-cases/candidate-resume.use-case';
import { JwtAuthGuard } from '@/modules/iam/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/iam/permissions/guards/permissions.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

@ApiTags('candidate-resumes')
@ApiBearerAuth()
@Controller('candidate/resumes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CandidateResumeController {
  constructor(private readonly resumeUseCase: CandidateResumeUseCase) {}

  @Get()
  @RequirePermissions('resumes.manage')
  @ResponseMessage('Hojas de vida obtenidas.')
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CandidateResumeResponseDto[]> {
    const items = await this.resumeUseCase.list(user.userId, user.role);
    return items.map(toCandidateResumeResponse);
  }

  @Post()
  @RequirePermissions('resumes.manage')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Hoja de vida cargada.')
  async upload(
    @UploadedFile() file: CandidateResumeUploadFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateResumeResponseDto> {
    const saved = await this.resumeUseCase.upload({
      file,
      userId: user.userId,
      role: user.role,
      ip: client.ip,
      userAgent: client.userAgent,
    });
    return toCandidateResumeResponse(saved);
  }

  @Patch(':id/select')
  @RequirePermissions('resumes.manage')
  @ResponseMessage('Hoja de vida principal actualizada.')
  async select(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<CandidateResumeResponseDto> {
    const saved = await this.resumeUseCase.select(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
    return toCandidateResumeResponse(saved);
  }

  @Get(':id/download')
  @RequirePermissions('resumes.manage')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.resumeUseCase.getDownload(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );

    response.setHeader('Content-Type', result.resume.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.resume.fileName)}"`,
    );

    return new StreamableFile(result.stream);
  }

  @Delete(':id')
  @RequirePermissions('resumes.manage')
  @ResponseMessage('Hoja de vida eliminada.')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientInfoPayload,
  ): Promise<void> {
    await this.resumeUseCase.remove(
      id,
      user.userId,
      user.role,
      client.ip,
      client.userAgent,
    );
  }
}
