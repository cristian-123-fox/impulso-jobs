import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IconName, IjButton, IjIcon, IjModal } from '@/shared/ui';
import { TeamFacade } from '@/features/company/team/data/team.facade';
import { MemberForm } from '@/features/company/team/components/member-form/member-form';
import { MemberRoleForm } from '@/features/company/team/components/member-role-form/member-role-form';
import {
  TeamActionEvent,
  TeamTable,
} from '@/features/company/team/components/team-table/team-table';
import {
  AddCompanyMemberPayload,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyMemberRole,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';

/** Usuarios de la empresa: alta, cambio de rol interno y baja, en modal. */
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeamTable, MemberForm, MemberRoleForm, IjButton, IjIcon, IjModal],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">
            Usuarios de la empresa
          </h1>
          <p class="mt-1.5 text-[13.5px] text-muted">
            Quién puede entrar a la cuenta de tu empresa y con qué alcance.
          </p>
        </div>
        @if (facade.canManage()) {
          <button
            ij-button
            type="button"
            variant="primary"
            shape="rounded"
            size="md"
            (click)="openAdd()"
          >
            <ij-icon name="plus" [size]="16" />
            Nuevo usuario
          </button>
        }
      </div>

      <div class="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of statCards(); track card.label) {
          <div class="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card">
            <span
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              [class]="card.tone"
            >
              <ij-icon [name]="card.icon" [size]="20" [strokeWidth]="1.9" />
            </span>
            <div>
              <div class="text-[21px] font-extrabold leading-tight text-ink-900">
                {{ card.value }}
              </div>
              <div class="text-[12.5px] text-muted">{{ card.label }}</div>
            </div>
          </div>
        }
      </div>

      @if (actionError(); as message) {
        <p
          role="alert"
          class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
        >
          {{ message }}
        </p>
      }

      @if (!facade.canManage() && facade.state() === 'loaded') {
        <div
          class="mb-4 flex items-start gap-3 rounded-xl bg-accent-amber-soft px-4 py-3.5 text-[13.5px] text-[#8a5410]"
        >
          <span class="mt-0.5 flex-shrink-0">
            <ij-icon name="alert-triangle" [size]="17" />
          </span>
          <div>
            <p class="font-semibold">
              Tu rol interno es «{{ myRoleLabel() }}»: sólo puedes consultar el equipo.
            </p>
            <p class="mt-0.5">
              Dar de alta usuarios o cambiar roles es de Propietario o Administrador.
              @if (owners(); as list) {
                Pídeselo a {{ list }}.
              }
            </p>
          </div>
        </div>
      }

      @switch (facade.state()) {
        @case ('loading') {
          <div class="rounded-2xl bg-white p-10 text-center text-muted shadow-card">
            Cargando el equipo…
          </div>
        }
        @case ('error') {
          <div class="rounded-2xl bg-white p-10 text-center text-red-600 shadow-card">
            No se pudo cargar el equipo.
          </div>
        }
        @default {
          <app-team-table
            [members]="facade.members()"
            [currentUserId]="facade.currentUserId()"
            [canManage]="facade.canManage()"
            (action)="onAction($event)"
          />
        }
      }
    </div>

    @if (showAdd()) {
      <ij-modal
        title="Nuevo usuario de la empresa"
        subtitle="Podrá iniciar sesión en cuanto se cree."
        (close)="closeForms()"
      >
        <app-member-form
          [submitting]="saving()"
          [error]="formError()"
          (add)="onAdd($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (editing(); as member) {
      <ij-modal
        title="Rol dentro de la empresa"
        [subtitle]="member.email"
        size="sm"
        (close)="closeForms()"
      >
        <app-member-role-form
          [member]="member"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onRoleChange(member, $event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }
  `,
})
export class TeamPage {
  protected readonly facade = inject(TeamFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showAdd = signal(false);
  protected readonly editing = signal<CompanyMember | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  /** Rol interno de quien navega, para explicar por qué no puede gestionar. */
  protected readonly myRoleLabel = computed(() => {
    const me = this.facade
      .members()
      .find((member) => member.userId === this.facade.currentUserId());
    return me ? COMPANY_MEMBER_ROLE_LABELS[me.companyRole] : 'Miembro';
  });

  /** A quién pedirle el alta. `null` si el equipo aún no cargó. */
  protected readonly owners = computed(() => {
    const managers = this.facade
      .members()
      .filter((member) => TEAM_MANAGER_ROLES.includes(member.companyRole))
      .map((member) => member.email);
    return managers.length ? managers.join(' o ') : null;
  });

  protected readonly statCards = computed(() => {
    const stats = this.facade.stats();
    return [
      {
        label: 'Usuarios',
        value: stats.total,
        icon: 'users' as IconName,
        tone: 'bg-brand-50 text-brand',
      },
      {
        label: 'Propietarios',
        value: stats.owners,
        icon: 'shield' as IconName,
        tone: 'bg-accent-blue-soft text-accent-blue',
      },
      {
        label: 'Reclutadores',
        value: stats.recruiters,
        icon: 'briefcase' as IconName,
        tone: 'bg-accent-green-soft text-accent-green',
      },
      {
        label: 'Sin verificar',
        value: stats.pending,
        icon: 'mail' as IconName,
        tone: 'bg-accent-amber-soft text-accent-amber',
      },
    ];
  });

  constructor() {
    this.facade.load();
  }

  protected openAdd(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.showAdd.set(true);
  }

  protected closeForms(): void {
    this.showAdd.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected onAction(event: TeamActionEvent): void {
    const { action, member } = event;
    if (action === 'role') {
      this.showAdd.set(false);
      this.formError.set(null);
      this.editing.set(member);
      return;
    }
    this.onRemove(member);
  }

  protected onAdd(payload: AddCompanyMemberPayload): void {
    this.submit(this.facade.add(payload), 'No se pudo agregar al usuario.');
  }

  protected onRoleChange(
    member: CompanyMember,
    role: CompanyMemberRole,
  ): void {
    this.submit(
      this.facade.updateRole(member.userId, role),
      'No se pudo cambiar el rol interno.',
    );
  }

  private onRemove(member: CompanyMember): void {
    if (
      !confirm(
        `¿Quitar a ${member.email} del equipo? Su cuenta se conserva, pero dejará de tener acceso a la empresa.`,
      )
    ) {
      return;
    }
    this.actionError.set(null);
    this.facade
      .remove(member.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo quitar al usuario.'),
          ),
      });
  }

  /** Envío desde un modal: cierra al terminar, deja el error dentro si falla. */
  private submit(request: Observable<unknown>, fallback: string): void {
    this.saving.set(true);
    this.formError.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForms();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(this.messageOf(error, fallback));
      },
    });
  }

  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
