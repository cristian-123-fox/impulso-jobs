import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CandidateResumeApi } from '@/features/panel/data/candidate-resume.api';
import {
  CandidateResume,
  CandidateResumeDownload,
} from '@/features/panel/models/candidate-resume.models';

@Injectable({ providedIn: 'root' })
export class CandidateResumeFacade {
  private readonly api = inject(CandidateResumeApi);

  private readonly resumesState = signal<CandidateResume[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly resumes = this.resumesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<CandidateResume[]> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.list().pipe(
      tap({
        next: (resumes) => {
          this.resumesState.set(resumes);
          this.loadedState.set(true);
          this.loadingState.set(false);
        },
        error: () => {
          this.errorState.set('No pudimos cargar tus hojas de vida.');
          this.loadingState.set(false);
        },
      }),
    );
  }

  upload(file: File): Observable<CandidateResume> {
    return this.api.upload(file).pipe(
      tap((resume) =>
        this.resumesState.update((items) => this.sortResumes([resume, ...items])),
      ),
    );
  }

  select(id: string): Observable<CandidateResume> {
    return this.api.select(id).pipe(
      tap((selected) =>
        this.resumesState.update((items) =>
          this.sortResumes(
            items.map((item) => ({
              ...item,
              isDefault: item.id === selected.id,
            })),
          ),
        ),
      ),
    );
  }

  download(id: string): Observable<CandidateResumeDownload> {
    return this.api.download(id);
  }

  remove(id: string): Observable<void> {
    return this.api.remove(id).pipe(
      tap(() =>
        this.resumesState.update((items) => {
          const remaining = items.filter((item) => item.id !== id);
          if (remaining.length > 0 && !remaining.some((item) => item.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return this.sortResumes(remaining);
        }),
      ),
    );
  }

  private sortResumes(items: CandidateResume[]): CandidateResume[] {
    return [...items].sort((left, right) => {
      if (left.isDefault !== right.isDefault) {
        return left.isDefault ? -1 : 1;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }
}
