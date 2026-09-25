import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { IconName, IjButton, IjIcon, IjModal } from '@/shared/ui';
import { TeamFacade } from '@/features/company/team/data/team.facade';
import { MemberForm } from '@/features/company/team/components/member-form/member-form';
import {
  MemberRoleChange,
  MemberRoleForm,
} from '@/features/company/team/components/member-role-form/member-role-form';
import { CompanyRoleForm } from '@/features/company/team/components/company-role-form/company-role-form';
import {
  CompanyRoleActionEvent,
  CompanyRolesTable,
} from '@/features/company/team/components/company-roles-table/company-roles-table';
import {
  TeamActionEvent,
  TeamTable,
} from '@/features/company/team/components/team-table/team-table';
import {
  AddCompanyMemberPayload,
  COMPANY_MEMBER_ROLE_LABELS,
  CompanyMember,
  CompanyRole,
  SaveCompanyRolePayload,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';

type TeamTab = 'team' | 'roles';

/**
 * Usuarios de la empresa y sus roles. Dos pestañas:
 *
 * - **Equipo**: alta, rol interno, permisos y baja, en modal.
 * - **Roles**: perfiles de permisos propios de la empresa, para limitar lo que
 *   puede hacer un reclutador o un miembro. Sólo la ve quien gestiona el
 *   equipo (propietario o administrador), que es quien puede asignarlos.
 */
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TeamTable,
    MemberForm,
    MemberRoleForm,
    CompanyRoleForm,
    CompanyRolesTable,
    IjButton,
    IjIcon,
    IjModal,
  ],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
            Usuarios de la empresa
          </h1>
          <p class="mt-1.5 text-[14px] font-medium text-muted">
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
            (click)="tab() === 'roles' ? openRoleForm(null) : openAdd()"
          >
            <ij-icon name="plus" [size]="16" />
            {{ tab() === 'roles' ? 'Nuevo rol' : 'Nuevo usuario' }}
          </button>
        }
      </div>

      @if (facade.canManage()) {
        <!-- Con -mb-px hace falta overflow-y-hidden (ver CLAUDE.md). -->
        <div
          role="tablist"
          class="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line"
        >
          @for (item of tabs; track item.value) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === item.value"
              [class]="tabClass(item.value)"
              (click)="selectTab(item.value)"
            >
              {{ item.label }}
              @if (item.value === 'roles' && facade.roles().length) {
                <span class="rounded-full bg-surface px-1.5 text-[11px] font-extrabold text-muted">
                  {{ facade.roles().length }}
                </span>
              }
            </button>
          }
        </div>
      }

      @if (tab() === 'team') {

      <div class="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (card of statCards(); track card.label) {
          <div class="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 shadow-card">
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

      <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      @switch (facade.state()) {
        @case ('loading') {
          <div class="p-10 text-center text-[13.5px] text-muted">
            Cargando el equipo…
          </div>
        }
        @case ('error') {
          <div class="p-10 text-center text-[13.5px] font-medium text-red-600">
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
      </section>
      } @else {
        <p class="mb-4 text-[13.5px] text-muted">
          Un rol limita lo que puede hacer una persona del equipo. Asígnalo desde la pestaña
          «Equipo», al editar a un reclutador o a un miembro. Los cambios se aplican al momento.
        </p>

        @if (actionError(); as message) {
          <p
            role="alert"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-700"
          >
            {{ message }}
          </p>
        }

        <section class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          @switch (facade.rolesState()) {
            @case ('loading') {
              <div class="p-10 text-center text-[13.5px] text-muted">Cargando roles…</div>
            }
            @case ('error') {
              <div class="p-10 text-center text-[13.5px] font-medium text-red-600">
                No se pudieron cargar los roles.
              </div>
            }
            @default {
              <app-company-roles-table
                [roles]="facade.roles()"
                (action)="onRoleAction($event)"
              />
            }
          }
        </section>
      }
    </div>

    @if (roleForm(); as form) {
      <ij-modal
        [title]="form.role ? 'Editar rol' : 'Nuevo rol'"
        subtitle="Marca lo que podrá hacer quien tenga este rol."
        size="lg"
        [scrollable]="true"
        (close)="closeForms()"
      >
        <app-company-role-form
          [role]="form.role"
          [groups]="facade.permissionTree()"
          [locked]="facade.lockedCodes()"
          [submitting]="saving()"
          [error]="formError()"
          (save)="onSaveRole(form.role, $event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (showAdd()) {
      <ij-modal
        title="Nuevo usuario de la empresa"
        subtitle="Podrá iniciar sesión en cuanto se cree."
        (close)="closeForms()"
      >
        <app-member-form
          [roles]="facade.roles()"
          [submitting]="saving()"
          [error]="formError()"
          (add)="onAdd($event)"
          (cancel)="closeForms()"
        />
      </ij-modal>
    }

    @if (editing(); as member) {
      <ij-modal
        title="Rol y permisos"
        [subtitle]="memberLabel(member)"
        size="sm"
        (close)="closeForms()"
      >
        <app-member-role-form
          [member]="member"
          [roles]="facade.roles()"
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

  protected readonly tabs: readonly { value: TeamTab; label: string }[] = [
    { value: 'team', label: 'Equipo' },
    { value: 'roles', label: 'Roles' },
  ];
  protected readonly tab = signal<TeamTab>('team');
  /** Modal de rol abierto; `role: null` = alta. */
  protected readonly roleForm = signal<{ role: CompanyRole | null } | null>(
    null,
  );

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

    // Los roles se piden sólo si quien navega gestiona el equipo: para el resto
    // el backend responde 403, y además no los necesita (no asigna nada).
    effect(() => {
      if (this.facade.canManage() && this.facade.rolesState() === 'idle') {
        this.facade.loadRoles();
      }
    });
  }

  protected selectTab(tab: TeamTab): void {
    this.actionError.set(null);
    this.tab.set(tab);
  }

  protected tabClass(value: TeamTab): string {
    const base =
      'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-2.5 ' +
      '-mb-px text-[13.5px] font-bold transition-colors';
    return this.tab() === value
      ? `${base} border-brand text-brand-strong`
      : `${base} border-transparent text-muted hover:text-ink-900`;
  }

  protected openRoleForm(role: CompanyRole | null): void {
    this.formError.set(null);
    this.facade.loadCatalog();
    this.roleForm.set({ role });
  }

  protected onRoleAction(event: CompanyRoleActionEvent): void {
    if (event.action === 'edit') {
      this.openRoleForm(event.role);
      return;
    }
    if (!confirm(`¿Eliminar el rol «${event.role.name}»? No se puede deshacer.`)) {
      return;
    }
    this.actionError.set(null);
    this.facade
      .deleteRole(event.role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error: unknown) =>
          this.actionError.set(
            this.messageOf(error, 'No se pudo eliminar el rol.'),
          ),
      });
  }

  protected onSaveRole(
    role: CompanyRole | null,
    payload: SaveCompanyRolePayload,
  ): void {
    this.submit(
      this.facade.saveRole(role?.id ?? null, payload),
      role ? 'No se pudo guardar el rol.' : 'No se pudo crear el rol.',
    );
  }

  protected openAdd(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.showAdd.set(true);
  }

  protected closeForms(): void {
    this.showAdd.set(false);
    this.editing.set(null);
    this.roleForm.set(null);
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

  protected onRoleChange(member: CompanyMember, change: MemberRoleChange): void {
    this.submit(
      this.facade.updateRole(member.userId, change.role, change.accessRoleId),
      'No se pudo cambiar el rol.',
    );
  }

  /** A quién nombra un diálogo: la persona si la conocemos, si no el correo. */
  protected memberLabel(member: CompanyMember): string {
    return member.displayName || member.email;
  }

  private onRemove(member: CompanyMember): void {
    if (
      !confirm(
        `¿Quitar a ${this.memberLabel(member)} del equipo? Su cuenta se conserva, pero dejará de tener acceso a la empresa.`,
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
