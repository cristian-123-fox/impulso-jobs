import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CompanyProfileApi } from '@/features/panel/data/company-profile.api';
import {
  CompanyLogoPayload,
  CompanyProfile,
  CompanyProfilePayload,
} from '@/features/panel/models/company-profile.models';

@Injectable({ providedIn: 'root' })
export class CompanyProfileFacade {
  private readonly api = inject(CompanyProfileApi);

  private readonly profileState = signal<CompanyProfile | null>(null);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<CompanyProfile> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.getProfile().pipe(
      tap({
        next: (profile) => {
          this.profileState.set(profile);
          this.loadedState.set(true);
          this.loadingState.set(false);
        },
        error: () => {
          this.errorState.set('No pudimos cargar el perfil de la empresa.');
          this.loadingState.set(false);
        },
      }),
    );
  }

  save(payload: CompanyProfilePayload): Observable<CompanyProfile> {
    return this.api
      .updateProfile(payload)
      .pipe(tap((profile) => this.profileState.set(profile)));
  }

  updateLogo(payload: CompanyLogoPayload): Observable<{ logoUrl: string | null }> {
    return this.api.updateLogo(payload).pipe(
      tap((result) => {
        const profile = this.profileState();
        if (profile) {
          this.profileState.set({ ...profile, logoUrl: result.logoUrl });
        }
      }),
    );
  }
}
