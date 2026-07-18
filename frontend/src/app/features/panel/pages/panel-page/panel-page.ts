import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import { PanelRole } from '@/features/panel/models/panel.models';
import { PanelSidebar } from '@/features/panel/components/panel-sidebar/panel-sidebar';
import { PanelHeader } from '@/features/panel/components/panel-header/panel-header';
import { PanelKpis } from '@/features/panel/components/panel-kpis/panel-kpis';
import { AdminDashboard } from '@/features/panel/components/admin-dashboard/admin-dashboard';
import { EmpresaDashboard } from '@/features/panel/components/empresa-dashboard/empresa-dashboard';
import { PostulanteDashboard } from '@/features/panel/components/postulante-dashboard/postulante-dashboard';
import { PlansCatalog } from '@/features/panel/components/plans-catalog/plans-catalog';
import { PromoBuy } from '@/features/panel/components/promo-buy/promo-buy';
import { JobCards } from '@/features/panel/components/job-cards/job-cards';
import { VacancyForm } from '@/features/panel/components/vacancy-form/vacancy-form';
import { DataTable } from '@/features/panel/components/data-table/data-table';
import { CandidateProfileComponent } from '@/features/panel/components/candidate-profile/candidate-profile';
import { CandidateResumesComponent } from '@/features/panel/components/candidate-resumes/candidate-resumes';
import { CandidateSettingsComponent } from '@/features/panel/components/candidate-settings/candidate-settings';
import { Role } from '@/core/models/role.enum';

/**
 * Contenedor del panel multi-rol. Mantiene el estado de rol/vista/página con
 * señales (equivalente al `state` del prototipo) y resuelve, vía el facade, qué
 * navegación, KPIs y bloque de contenido se muestran.
 */
@Component({
  selector: 'app-panel-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PanelSidebar,
    PanelHeader,
    PanelKpis,
    AdminDashboard,
    EmpresaDashboard,
    PostulanteDashboard,
    PlansCatalog,
    PromoBuy,
    JobCards,
    VacancyForm,
    DataTable,
    CandidateProfileComponent,
    CandidateResumesComponent,
    CandidateSettingsComponent,
  ],
  template: `
    <div class="flex min-h-screen w-full bg-surface text-ink-900">
      @if (sidebarOpen()) {
        <div
          class="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          aria-hidden="true"
          (click)="sidebarOpen.set(false)"
        ></div>
      }

      <app-panel-sidebar
        [meta]="meta()"
        [navItems]="navItems()"
        [activeKey]="view()"
        [open]="sidebarOpen()"
        (navigate)="onNavigate($event)"
        (close)="sidebarOpen.set(false)"
      />

      <div class="flex min-w-0 flex-1 flex-col">
        <app-panel-header
          [meta]="meta()"
          [role]="role()"
          [availableRoles]="availableRoles()"
          (roleChange)="onRole($event)"
          (toggleSidebar)="toggleSidebar()"
          (logout)="onLogout()"
        />

        <main class="flex-1 overflow-y-auto p-4 sm:p-7">
          <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
                {{ meta().title }}
              </h1>
              <p class="mt-1.5 text-[13.5px] text-muted">{{ meta().subtitle }}</p>
            </div>
            <div class="flex items-center gap-2 text-[13px] text-muted">
              <span>Impulso Jobs</span>
              <span class="text-line">/</span>
              <span class="font-semibold text-brand">{{ meta().crumb }}</span>
            </div>
          </div>

          @if (kpis().length) {
            <app-panel-kpis class="mb-[18px] block" [kpis]="kpis()" />
          }

          @switch (content()) {
            @case ('admin-dashboard') {
              <app-admin-dashboard (navigate)="onNavigate($event)" />
            }
            @case ('empresa-dashboard') {
              <app-empresa-dashboard (navigate)="onNavigate($event)" />
            }
            @case ('postulante-dashboard') {
              <app-postulante-dashboard (navigate)="onNavigate($event)" />
            }
            @case ('plans-catalog') {
              <app-plans-catalog />
            }
            @case ('promo-buy') {
              <app-promo-buy />
            }
            @case ('job-cards') {
              <app-job-cards />
            }
            @case ('candidate-profile') {
              <app-candidate-profile />
            }
            @case ('candidate-resumes') {
              <app-candidate-resumes />
            }
            @case ('candidate-settings') {
              <app-candidate-settings />
            }
            @case ('vacancy-form') {
              <app-vacancy-form (navigate)="onNavigate($event)" />
            }
            @case ('table') {
              <app-data-table
                [table]="table()!"
                [page]="page()"
                (pageChange)="page.set($event)"
              />
            }
            @default {
              <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
                Sin contenido para esta vista.
              </div>
            }
          }
        </main>
      </div>
    </div>
  `,
})
export class PanelPage {
  private readonly facade = inject(PanelFacade);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly role = signal<PanelRole>(
    this.resolvePanelRole(this.auth.currentUser()?.role),
  );
  protected readonly view = signal(
    this.auth.currentUser()?.role === Role.CANDIDATE ? 'perfil' : 'dashboard',
  );
  protected readonly page = signal(0);
  /** Visible por defecto (escritorio); se auto-colapsa en pantallas pequeñas. */
  protected readonly sidebarOpen = signal(true);

  constructor() {
    afterNextRender(() => {
      if (window.innerWidth < 1024) this.sidebarOpen.set(false);
    });
  }

  protected readonly navItems = computed(() =>
    this.facade.nav(this.role(), this.view()),
  );
  protected readonly availableRoles = computed<readonly PanelRole[]>(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) return ['admin', 'empresa', 'postulante'];
    return [this.resolvePanelRole(role)];
  });
  protected readonly meta = computed(() => this.facade.meta(this.role(), this.view()));
  protected readonly kpis = computed(() => this.facade.kpis(this.role(), this.view()));
  protected readonly content = computed(() =>
    this.facade.resolveContent(this.role(), this.view()),
  );
  protected readonly table = computed(() => this.facade.table(this.role(), this.view()));

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected onNavigate(key: string): void {
    this.view.set(key);
    this.page.set(0);
    // En móvil el sidebar es un drawer: se cierra tras navegar.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.sidebarOpen.set(false);
    }
  }

  protected onRole(role: PanelRole): void {
    if (!this.availableRoles().includes(role)) return;
    this.role.set(role);
    this.view.set('dashboard');
    this.page.set(0);
  }

  protected onLogout(): void {
    this.auth
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl('/auth/login'));
  }

  private resolvePanelRole(role: Role | undefined): PanelRole {
    switch (role) {
      case Role.EMPLOYER:
        return 'empresa';
      case Role.CANDIDATE:
        return 'postulante';
      default:
        return 'admin';
    }
  }
}
