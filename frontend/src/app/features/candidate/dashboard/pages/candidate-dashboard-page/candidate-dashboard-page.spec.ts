import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { CandidateDashboardApi } from '@/features/candidate/dashboard/data/dashboard.api';
import { CandidateDashboard } from '@/features/candidate/dashboard/models/dashboard.models';
import { CandidateDashboardPage } from '@/features/candidate/dashboard/pages/candidate-dashboard-page/candidate-dashboard-page';

/**
 * Reproduce el panel con la carga real de un candidato que SÍ tiene
 * postulaciones. Es lo que activa las ramas de las gráficas, que un candidato
 * sin postulaciones nunca ejecuta.
 */
const CON_POSTULACIONES: CandidateDashboard = {
  periodDays: 30,
  firstName: 'Sebastian',
  kpis: {
    totalApplications: 1,
    activeApplications: 1,
    newApplications: 1,
    savedVacancies: 1,
  },
  applicationsTrend: Array.from({ length: 30 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    count: i === 4 ? 1 : 0,
  })),
  applicationsByStatus: [
    { code: 'SENT', name: 'Enviada', count: 1, isFinal: false },
    { code: 'IN_PROGRESS', name: 'En proceso', count: 0, isFinal: false },
    { code: 'SELECTED', name: 'Seleccionado', count: 0, isFinal: true },
  ],
  profileCompletion: {
    percent: 33,
    completed: 3,
    total: 9,
    tasks: [
      { key: 'photo', label: 'Añade tu foto', route: '/candidato/perfil', done: true },
      { key: 'summary', label: 'Resumen', route: '/candidato/perfil', done: false },
    ],
  },
  profileViews: { recent: 0, lastViewedAt: null },
} as unknown as CandidateDashboard;

describe('CandidateDashboardPage con postulaciones', () => {
  let fixture: ComponentFixture<CandidateDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
        {
          provide: CandidateDashboardApi,
          useValue: { get: () => of(CON_POSTULACIONES) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateDashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('saluda con el nombre del candidato', () => {
    expect(fixture.nativeElement.textContent).toContain('Hola, Sebastian');
  });

  it('pinta las tarjetas de indicadores', () => {
    expect(fixture.nativeElement.querySelectorAll('ij-kpi-card').length).toBe(4);
  });

  it('monta las gráficas de una cuenta con postulaciones', () => {
    expect(fixture.nativeElement.querySelectorAll('ij-chart').length).toBe(3);
  });
});