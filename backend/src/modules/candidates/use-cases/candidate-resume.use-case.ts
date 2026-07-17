import { ReadStream, readFileSync } from 'node:fs';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/types/error-code.enum';
import { Role } from '@/common/types/role.enum';
import { runInTransaction } from '@/common/utils/transaction.util';
import { AuditService } from '@/modules/audit/audit.service';
import { CandidateResume } from '@/modules/candidates/entities/candidate-resume.entity';
import type { CandidateActor } from '@/modules/candidates/use-cases/candidate-profile.use-case';
import { CANDIDATE_PROFILE_REPOSITORY } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import type { ICandidateProfileRepository } from '@/modules/candidates/repositories/candidate-profile.repository.interface';
import { CANDIDATE_RESUME_REPOSITORY } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import type { ICandidateResumeRepository } from '@/modules/candidates/repositories/candidate-resume.repository.interface';
import { CANDIDATE_RESUME_STORAGE } from '@/modules/candidates/services/candidate-resume-storage.port';
import type { ICandidateResumeStorage } from '@/modules/candidates/services/candidate-resume-storage.port';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF-');

export interface CandidateResumeUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadCandidateResumeCommand extends CandidateActor {
  file?: CandidateResumeUploadFile;
}

@Injectable()
export class CandidateResumeUseCase {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CANDIDATE_PROFILE_REPOSITORY)
    private readonly profiles: ICandidateProfileRepository,
    @Inject(CANDIDATE_RESUME_REPOSITORY)
    private readonly resumes: ICandidateResumeRepository,
    @Inject(CANDIDATE_RESUME_STORAGE)
    private readonly storage: ICandidateResumeStorage,
    private readonly audit: AuditService,
  ) { }

  async list(userId: string, role: Role): Promise<CandidateResume[]> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);
    return this.resumes.findByProfileId(profile.id);
  }

  async upload(
    command: UploadCandidateResumeCommand,
  ): Promise<CandidateResume> {
    this.assertCandidateRole(command.role);
    const profile = await this.requireProfile(command.userId);
    // #region debug-point A:upload-input
    (() => {
      let u = 'http://127.0.0.1:7777/event';
      let s = 'resume-upload-400';
      try {
        const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch { }
      void fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: s,
          runId: 'pre-fix',
          hypothesisId: 'A',
          location: 'candidate-resume.use-case.ts:upload:start',
          msg: '[DEBUG] upload input received',
          data: {
            hasFile: Boolean(command.file),
            originalname: command.file?.originalname ?? null,
            mimetype: command.file?.mimetype ?? null,
            size: command.file?.size ?? null,
            bufferLength: command.file?.buffer?.length ?? null,
          },
          ts: Date.now(),
        }),
      }).catch(() => { });
    })();
    // #endregion
    const file = this.requireValidFile(command.file);
    // #region debug-point B:file-validated
    (() => {
      let u = 'http://127.0.0.1:7777/event';
      let s = 'resume-upload-400';
      try {
        const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
        u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
        s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
      } catch { }
      void fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: s,
          runId: 'pre-fix',
          hypothesisId: 'B',
          location: 'candidate-resume.use-case.ts:upload:validated',
          msg: '[DEBUG] file passed validation',
          data: {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            hasPdfExtension: file.originalname.toLowerCase().endsWith('.pdf'),
            hasPdfMime: file.mimetype === 'application/pdf',
            hasPdfSignature: file.buffer
              .subarray(0, PDF_MAGIC.length)
              .equals(PDF_MAGIC),
          },
          ts: Date.now(),
        }),
      }).catch(() => { });
    })();
    // #endregion

    const resume = Object.assign(new CandidateResume(), {
      id: randomUUID(),
      candidateProfileId: profile.id,
      fileName: this.normalizeFileName(file.originalname),
      fileUrl: '',
      fileSize: file.size,
      mimeType: 'application/pdf',
      storageKey: '',
      isDefault: false,
    });

    try {
      const stored = await this.storage.save({
        profileId: profile.id,
        resumeId: resume.id,
        buffer: file.buffer,
      });
      // #region debug-point C:storage-saved
      (() => {
        let u = 'http://127.0.0.1:7777/event';
        let s = 'resume-upload-400';
        try {
          const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch { }
        void fetch(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'candidate-resume.use-case.ts:upload:storage',
            msg: '[DEBUG] storage save completed',
            data: {
              profileId: profile.id,
              resumeId: resume.id,
              storageKey: stored.storageKey,
            },
            ts: Date.now(),
          }),
        }).catch(() => { });
      })();
      // #endregion

      resume.storageKey = stored.storageKey;
      resume.fileUrl = `/api/v1/candidate/resumes/${resume.id}/download`;

      const saved = await runInTransaction(this.dataSource, async (manager) => {
        const total = await this.resumes.countByProfileId(profile.id, manager);
        resume.isDefault = total === 0;
        return this.resumes.save(resume, manager);
      });
      // #region debug-point D:db-saved
      (() => {
        let u = 'http://127.0.0.1:7777/event';
        let s = 'resume-upload-400';
        try {
          const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch { }
        void fetch(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'D',
            location: 'candidate-resume.use-case.ts:upload:db',
            msg: '[DEBUG] resume persisted successfully',
            data: {
              id: saved.id,
              candidateProfileId: saved.candidateProfileId,
              isDefault: saved.isDefault,
              storageKey: saved.storageKey,
            },
            ts: Date.now(),
          }),
        }).catch(() => { });
      })();
      // #endregion

      await this.audit.record({
        action: 'candidate.resume.upload',
        actorUserId: command.userId,
        entity: 'candidate_resume',
        entityId: saved.id,
        ip: command.ip,
        userAgent: command.userAgent,
        metadata: {
          fileName: saved.fileName,
          fileSize: saved.fileSize,
          mimeType: saved.mimeType,
          isDefault: saved.isDefault,
        },
      });

      return saved;
    } catch (error) {
      if (resume.storageKey) {
        await this.safeDelete(resume.storageKey);
      }

      if (error instanceof AppException) {
        // #region debug-point E:app-exception
        (() => {
          let u = 'http://127.0.0.1:7777/event';
          let s = 'resume-upload-400';
          try {
            const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
            u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
            s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
          } catch { }
          const response = error.getResponse() as { errorCode?: string; message?: string };
          void fetch(u, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: s,
              runId: 'pre-fix',
              hypothesisId: 'E',
              location: 'candidate-resume.use-case.ts:upload:catch-app-exception',
              msg: '[DEBUG] upload failed with AppException',
              data: {
                name: error.constructor.name,
                errorCode: response.errorCode ?? null,
                message: response.message ?? error.message,
                storageKey: resume.storageKey || null,
              },
              ts: Date.now(),
            }),
          }).catch(() => { });
        })();
        // #endregion
        throw error;
      }

      // #region debug-point E:unknown-exception
      (() => {
        let u = 'http://127.0.0.1:7777/event';
        let s = 'resume-upload-400';
        try {
          const e = readFileSync('.dbg/resume-upload-400.env', 'utf8');
          u = e.match(/DEBUG_SERVER_URL=(.+)/)?.[1] || u;
          s = e.match(/DEBUG_SESSION_ID=(.+)/)?.[1] || s;
        } catch { }
        void fetch(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: s,
            runId: 'pre-fix',
            hypothesisId: 'E',
            location: 'candidate-resume.use-case.ts:upload:catch-unknown',
            msg: '[DEBUG] upload failed with unknown exception',
            data: {
              name: error instanceof Error ? error.constructor.name : typeof error,
              message: error instanceof Error ? error.message : String(error),
              stack:
                error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null,
              storageKey: resume.storageKey || null,
            },
            ts: Date.now(),
          }),
        }).catch(() => { });
      })();
      // #endregion

      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_RESUME_UPLOAD_FAILED,
        'No fue posible cargar la hoja de vida.',
      );
    }
  }

  async select(
    id: string,
    userId: string,
    role: Role,
    ip: string,
    userAgent: string,
  ): Promise<CandidateResume> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);

    const selected = await runInTransaction(
      this.dataSource,
      async (manager) => {
        const resume = await this.resumes.findByIdAndProfileId(
          id,
          profile.id,
          manager,
        );
        if (!resume) {
          throw new AppException(
            HttpStatus.NOT_FOUND,
            ErrorCode.CANDIDATE_RESUME_NOT_FOUND,
            'La hoja de vida no existe.',
          );
        }

        if (!resume.isDefault) {
          await this.resumes.clearDefaultByProfileId(profile.id, manager);
          resume.isDefault = true;
          await this.resumes.save(resume, manager);
        }

        return resume;
      },
    );

    await this.audit.record({
      action: 'candidate.resume.select',
      actorUserId: userId,
      entity: 'candidate_resume',
      entityId: selected.id,
      ip,
      userAgent,
      metadata: { fileName: selected.fileName },
    });

    return selected;
  }

  async getDownload(
    id: string,
    userId: string,
    role: Role,
    ip: string,
    userAgent: string,
  ): Promise<{ resume: CandidateResume; stream: ReadStream }> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);
    const resume = await this.requireResume(id, profile.id);

    try {
      const stream = await this.storage.openReadStream(resume.storageKey);
      await this.audit.record({
        action: 'candidate.resume.download',
        actorUserId: userId,
        entity: 'candidate_resume',
        entityId: resume.id,
        ip,
        userAgent,
        metadata: { fileName: resume.fileName },
      });

      return { resume, stream };
    } catch (error) {
      const errorCode = this.isFileMissing(error)
        ? ErrorCode.CANDIDATE_RESUME_FILE_NOT_FOUND
        : ErrorCode.CANDIDATE_RESUME_DOWNLOAD_FAILED;

      throw new AppException(
        HttpStatus.NOT_FOUND,
        errorCode,
        'No fue posible descargar la hoja de vida.',
      );
    }
  }

  async remove(
    id: string,
    userId: string,
    role: Role,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    this.assertCandidateRole(role);
    const profile = await this.requireProfile(userId);
    const resume = await this.requireResume(id, profile.id);

    try {
      await this.storage.delete(resume.storageKey);
    } catch (error) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        this.isFileMissing(error)
          ? ErrorCode.CANDIDATE_RESUME_FILE_NOT_FOUND
          : ErrorCode.CANDIDATE_RESUME_DELETE_FAILED,
        'No fue posible eliminar la hoja de vida del almacenamiento.',
      );
    }

    await runInTransaction(this.dataSource, async (manager) => {
      const current = await this.resumes.findByIdAndProfileId(
        id,
        profile.id,
        manager,
      );
      if (!current) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.CANDIDATE_RESUME_NOT_FOUND,
          'La hoja de vida no existe.',
        );
      }

      await this.resumes.remove(current, manager);

      if (current.isDefault) {
        const replacement = await this.resumes.findLatestByProfileId(
          profile.id,
          manager,
        );
        if (replacement) {
          await this.resumes.clearDefaultByProfileId(profile.id, manager);
          replacement.isDefault = true;
          await this.resumes.save(replacement, manager);
        }
      }
    });

    await this.audit.record({
      action: 'candidate.resume.delete',
      actorUserId: userId,
      entity: 'candidate_resume',
      entityId: resume.id,
      ip,
      userAgent,
      metadata: { fileName: resume.fileName },
    });
  }

  private async requireProfile(userId: string) {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_PROFILE_NOT_FOUND,
        'No existe un perfil de candidato para este usuario.',
      );
    }
    return profile;
  }

  private async requireResume(
    id: string,
    candidateProfileId: string,
  ): Promise<CandidateResume> {
    const resume = await this.resumes.findByIdAndProfileId(
      id,
      candidateProfileId,
    );
    if (!resume) {
      throw new AppException(
        HttpStatus.NOT_FOUND,
        ErrorCode.CANDIDATE_RESUME_NOT_FOUND,
        'La hoja de vida no existe.',
      );
    }
    return resume;
  }

  private requireValidFile(
    file?: CandidateResumeUploadFile,
  ): CandidateResumeUploadFile {
    if (!file) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_RESUME_UPLOAD_FAILED,
        'Debes adjuntar un archivo PDF.',
      );
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_RESUME_TOO_LARGE,
        'La hoja de vida no puede superar los 5MB.',
      );
    }

    const hasPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');
    const hasPdfMime = file.mimetype === 'application/pdf';
    const hasPdfSignature = file.buffer
      .subarray(0, PDF_MAGIC.length)
      .equals(PDF_MAGIC);

    if (!hasPdfExtension || !hasPdfMime || !hasPdfSignature) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANDIDATE_RESUME_INVALID_TYPE,
        'Solo se permiten archivos PDF válidos.',
      );
    }

    return file;
  }

  private normalizeFileName(name: string): string {
    const normalized = name.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    return normalized.slice(0, 255) || 'resume.pdf';
  }

  private assertCandidateRole(role: Role): void {
    if (role !== Role.CANDIDATE) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN,
        'Solo los candidatos pueden gestionar sus hojas de vida.',
      );
    }
  }

  private isFileMissing(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }

  private async safeDelete(storageKey: string): Promise<void> {
    try {
      await this.storage.delete(storageKey);
    } catch {
      // Evita que una limpieza fallida opaque el error principal.
    }
  }
}
