import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CandidateSettingsApi } from '@/features/panel/data/candidate-settings.api';
import {
  CandidateSettings,
  CandidateSettingsPayload,
} from '@/features/panel/models/candidate-settings.models';

@Injectable({ providedIn: 'root' })
export class CandidateSettingsFacade {
  private readonly api = inject(CandidateSettingsApi);

  private readonly settingsState = signal<CandidateSettings | null>(null);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly settings = this.settingsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<CandidateSettings> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.get().pipe(
      tap({
        next: (settings) => {
          this.settingsState.set(settings);
          this.loadedState.set(true);
          this.loadingState.set(false);
        },
        error: () => {
          this.errorState.set('No pudimos cargar tu configuración.');
          this.loadingState.set(false);
        },
      }),
    );
  }

  save(payload: CandidateSettingsPayload): Observable<CandidateSettings> {
    return this.api
      .update(payload)
      .pipe(tap((settings) => this.settingsState.set(settings)));
  }
}
