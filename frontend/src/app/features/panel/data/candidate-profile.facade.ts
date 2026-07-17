import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CandidateProfileApi } from '@/features/panel/data/candidate-profile.api';
import { CandidateResumeApi } from '@/features/panel/data/candidate-resume.api';
import {
  CandidateEducation,
  CandidateEducationPayload,
  CandidateExperience,
  CandidateExperiencePayload,
  CandidateLanguage,
  CandidateLanguagePayload,
  CandidatePhotoPayload,
  CandidateProfile,
  CandidateProfilePayload,
  CandidateSkill,
  CandidateSkillPayload,
  LanguageCatalogItem,
} from '@/features/panel/models/candidate-profile.models';

@Injectable({ providedIn: 'root' })
export class CandidateProfileFacade {
  private readonly api = inject(CandidateProfileApi);
  private readonly resumeApi = inject(CandidateResumeApi);

  private readonly profileState = signal<CandidateProfile | null>(null);
  private readonly experiencesState = signal<CandidateExperience[]>([]);
  private readonly educationsState = signal<CandidateEducation[]>([]);
  private readonly languagesState = signal<CandidateLanguage[]>([]);
  private readonly skillsState = signal<CandidateSkill[]>([]);
  private readonly resumeCountState = signal(0);
  private readonly languageCatalogState = signal<LanguageCatalogItem[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly profile = this.profileState.asReadonly();
  readonly experiences = this.experiencesState.asReadonly();
  readonly educations = this.educationsState.asReadonly();
  readonly languages = this.languagesState.asReadonly();
  readonly skills = this.skillsState.asReadonly();
  readonly languageCatalog = this.languageCatalogState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly completionTasks = computed(() => {
    const profile = this.profileState();
    if (!profile) return [];
    return [
      { label: 'Datos básicos', done: Boolean(profile.firstName && profile.lastName) },
      { label: 'Resumen profesional', done: Boolean(profile.summary) },
      { label: 'Foto de perfil', done: Boolean(profile.profilePhotoUrl) },
      { label: 'Experiencia', done: this.experiencesState().length > 0 },
      { label: 'Educación', done: this.educationsState().length > 0 },
      { label: 'Idiomas', done: this.languagesState().length > 0 },
      { label: 'Habilidades', done: this.skillsState().length > 0 },
      { label: 'Hoja de vida', done: this.resumeCountState() > 0 },
    ];
  });

  loadAll(): Observable<unknown> {
    this.loadingState.set(true);
    this.errorState.set(null);
    return forkJoin({
      profile: this.api.getProfile(),
      experiences: this.api.listExperiences(),
      educations: this.api.listEducations(),
      languages: this.api.listLanguages(),
      skills: this.api.listSkills(),
      resumes: this.resumeApi.list(),
      languageCatalog: this.api.listLanguageCatalog(),
    }).pipe(
      tap({
        next: (result) => {
          this.profileState.set(result.profile);
          this.experiencesState.set(result.experiences);
          this.educationsState.set(result.educations);
          this.languagesState.set(result.languages);
          this.skillsState.set(result.skills);
          this.resumeCountState.set(result.resumes.length);
          this.languageCatalogState.set(result.languageCatalog);
          this.loadingState.set(false);
        },
        error: () => {
          this.errorState.set('No pudimos cargar tu perfil en este momento.');
          this.loadingState.set(false);
        },
      }),
    );
  }

  saveProfile(payload: CandidateProfilePayload): Observable<CandidateProfile> {
    return this.api.updateProfile(payload).pipe(
      tap((profile) => this.profileState.set(profile)),
    );
  }

  updatePhoto(payload: CandidatePhotoPayload): Observable<{ profilePhotoUrl: string | null }> {
    return this.api.updatePhoto(payload).pipe(
      tap((result) => {
        const profile = this.profileState();
        if (profile) {
          this.profileState.set({ ...profile, profilePhotoUrl: result.profilePhotoUrl });
        }
      }),
    );
  }

  saveExperience(
    payload: CandidateExperiencePayload,
    id?: string,
  ): Observable<CandidateExperience> {
    const request = id
      ? this.api.updateExperience(id, payload)
      : this.api.createExperience(payload);
    return request.pipe(tap(() => void this.refreshAllLists()));
  }

  deleteExperience(id: string): Observable<void> {
    return this.api.deleteExperience(id).pipe(tap(() => void this.refreshAllLists()));
  }

  saveEducation(
    payload: CandidateEducationPayload,
    id?: string,
  ): Observable<CandidateEducation> {
    const request = id ? this.api.updateEducation(id, payload) : this.api.createEducation(payload);
    return request.pipe(tap(() => void this.refreshAllLists()));
  }

  deleteEducation(id: string): Observable<void> {
    return this.api.deleteEducation(id).pipe(tap(() => void this.refreshAllLists()));
  }

  saveLanguage(payload: CandidateLanguagePayload, id?: string): Observable<CandidateLanguage> {
    const request = id ? this.api.updateLanguage(id, payload) : this.api.createLanguage(payload);
    return request.pipe(tap(() => void this.refreshAllLists()));
  }

  deleteLanguage(id: string): Observable<void> {
    return this.api.deleteLanguage(id).pipe(tap(() => void this.refreshAllLists()));
  }

  saveSkill(payload: CandidateSkillPayload, id?: string): Observable<CandidateSkill> {
    const request = id ? this.api.updateSkill(id, payload) : this.api.createSkill(payload);
    return request.pipe(tap(() => void this.refreshAllLists()));
  }

  deleteSkill(id: string): Observable<void> {
    return this.api.deleteSkill(id).pipe(tap(() => void this.refreshAllLists()));
  }

  private refreshAllLists(): void {
    this.loadAll().subscribe();
  }
}
