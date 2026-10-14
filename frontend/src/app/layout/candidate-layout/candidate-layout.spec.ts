import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EMPTY, of } from 'rxjs';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { AuthService } from '@/core/auth/auth.service';
import { CandidateProfileApi } from '@/features/candidate/data/candidate-profile.api';
import { CandidateProfileFacade } from '@/features/candidate/data/candidate-profile.facade';
import { CandidateResumeApi } from '@/features/candidate/data/candidate-resume.api';
import { CandidateLayout } from '@/layout/candidate-layout/candidate-layout';

/**
 * El armazón del área del candidato. El panel se abre dentro de él, así que si
 * el shell no monta, la ruta entera se ve en blanco aunque la página funcione.
 */
describe('CandidateLayout', () => {
  let fixture: ComponentFixture<CandidateLayout>;

  const profile = {
    firstName: 'Sebastian',
    lastName: 'Tovar chavez',
    profilePhotoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocK5W=s96-c',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              id: '1',
              email: 'sebastiantovarchavez304@gmail.com',
              role: 'CANDIDATE',
              avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocK5W=s96-c',
            }),
            permissions: () => null,
          },
        },
        {
          provide: CandidateProfileApi,
          useValue: {
            getProfile: () => of(profile),
            listExperiences: () => EMPTY,
            listEducations: () => EMPTY,
            listLanguages: () => EMPTY,
            listSkills: () => EMPTY,
            listLanguageCatalog: () => EMPTY,
          },
        },
        { provide: CandidateResumeApi, useValue: { list: () => EMPTY } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateLayout);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('monta el armazón', () => {
    expect(fixture.nativeElement.querySelector('app-shell')).not.toBeNull();
  });

  it('muestra el nombre del candidato', () => {
    expect(fixture.nativeElement.textContent).toContain('Sebastian Tovar chavez');
  });

  it('enlaza las secciones del área', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mi perfil');
    expect(text).toContain('Mis hojas de vida');
    expect(text).toContain('Mis postulaciones');
  });

  it('deja hueco el router-outlet para la página', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});