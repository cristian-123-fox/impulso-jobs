import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env';
import { ApiSuccessResponse } from '@/core/models/api-response.models';
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
export class CandidateProfileApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/candidate/profile`;

  getProfile(): Observable<CandidateProfile> {
    return this.http
      .get<ApiSuccessResponse<CandidateProfile>>(this.base)
      .pipe(map((response) => response.content));
  }

  updateProfile(payload: CandidateProfilePayload): Observable<CandidateProfile> {
    return this.http
      .put<ApiSuccessResponse<CandidateProfile>>(this.base, payload)
      .pipe(map((response) => response.content));
  }

  updatePhoto(payload: CandidatePhotoPayload): Observable<{ profilePhotoUrl: string | null }> {
    return this.http
      .patch<ApiSuccessResponse<{ profilePhotoUrl: string | null }>>(
        `${this.base}/photo`,
        payload,
      )
      .pipe(map((response) => response.content));
  }

  listLanguageCatalog(): Observable<LanguageCatalogItem[]> {
    return this.http
      .get<ApiSuccessResponse<LanguageCatalogItem[]>>(`${this.base}/catalogs/languages`)
      .pipe(map((response) => response.content));
  }

  listExperiences(): Observable<CandidateExperience[]> {
    return this.http
      .get<ApiSuccessResponse<CandidateExperience[]>>(`${this.base}/experience`)
      .pipe(map((response) => response.content));
  }

  createExperience(payload: CandidateExperiencePayload): Observable<CandidateExperience> {
    return this.http
      .post<ApiSuccessResponse<CandidateExperience>>(`${this.base}/experience`, payload)
      .pipe(map((response) => response.content));
  }

  updateExperience(id: string, payload: CandidateExperiencePayload): Observable<CandidateExperience> {
    return this.http
      .put<ApiSuccessResponse<CandidateExperience>>(`${this.base}/experience/${id}`, payload)
      .pipe(map((response) => response.content));
  }

  deleteExperience(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/experience/${id}`)
      .pipe(map(() => undefined));
  }

  listEducations(): Observable<CandidateEducation[]> {
    return this.http
      .get<ApiSuccessResponse<CandidateEducation[]>>(`${this.base}/education`)
      .pipe(map((response) => response.content));
  }

  createEducation(payload: CandidateEducationPayload): Observable<CandidateEducation> {
    return this.http
      .post<ApiSuccessResponse<CandidateEducation>>(`${this.base}/education`, payload)
      .pipe(map((response) => response.content));
  }

  updateEducation(id: string, payload: CandidateEducationPayload): Observable<CandidateEducation> {
    return this.http
      .put<ApiSuccessResponse<CandidateEducation>>(`${this.base}/education/${id}`, payload)
      .pipe(map((response) => response.content));
  }

  deleteEducation(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/education/${id}`)
      .pipe(map(() => undefined));
  }

  listLanguages(): Observable<CandidateLanguage[]> {
    return this.http
      .get<ApiSuccessResponse<CandidateLanguage[]>>(`${this.base}/languages`)
      .pipe(map((response) => response.content));
  }

  createLanguage(payload: CandidateLanguagePayload): Observable<CandidateLanguage> {
    return this.http
      .post<ApiSuccessResponse<CandidateLanguage>>(`${this.base}/languages`, payload)
      .pipe(map((response) => response.content));
  }

  updateLanguage(id: string, payload: CandidateLanguagePayload): Observable<CandidateLanguage> {
    return this.http
      .put<ApiSuccessResponse<CandidateLanguage>>(`${this.base}/languages/${id}`, payload)
      .pipe(map((response) => response.content));
  }

  deleteLanguage(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/languages/${id}`)
      .pipe(map(() => undefined));
  }

  listSkills(): Observable<CandidateSkill[]> {
    return this.http
      .get<ApiSuccessResponse<CandidateSkill[]>>(`${this.base}/skills`)
      .pipe(map((response) => response.content));
  }

  createSkill(payload: CandidateSkillPayload): Observable<CandidateSkill> {
    return this.http
      .post<ApiSuccessResponse<CandidateSkill>>(`${this.base}/skills`, payload)
      .pipe(map((response) => response.content));
  }

  updateSkill(id: string, payload: CandidateSkillPayload): Observable<CandidateSkill> {
    return this.http
      .put<ApiSuccessResponse<CandidateSkill>>(`${this.base}/skills/${id}`, payload)
      .pipe(map((response) => response.content));
  }

  deleteSkill(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessResponse<unknown>>(`${this.base}/skills/${id}`)
      .pipe(map(() => undefined));
  }
}
