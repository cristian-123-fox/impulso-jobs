import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { AuthService } from '@/core/auth/auth.service';
import { TeamApi } from '@/features/company/team/data/team.api';
import {
  AddCompanyMemberPayload,
  CompanyMember,
  CompanyMemberRole,
  CompanyPermissionCatalog,
  CompanyRole,
  SaveCompanyRolePayload,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';
import { PermissionTreeGroup } from '@/shared/permissions/permission-tree';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Fachada del equipo de la empresa: estado con Signals + acciones. */
@Injectable()
export class TeamFacade {
  private readonly api = inject(TeamApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly members = signal<CompanyMember[]>([]);
  readonly state = signal<LoadState>('idle');

  readonly roles = signal<CompanyRole[]>([]);
  readonly rolesState = signal<LoadState>('idle');
  readonly catalog = signal<CompanyPermissionCatalog | null>(null);

  /**
   * El catálogo convertido al árbol compartido. El árbol trabaja con ids; aquí
   * el id **es el código**, que es con lo que habla la API de roles de empresa.
   */
  readonly permissionTree = computed<PermissionTreeGroup[]>(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    return catalog.groups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        group,
        items: catalog.permissions
          .filter((permission) => permission.group === group.key)
          .map((permission) => ({
            id: permission.code,
            code: permission.code,
            label: permission.label,
            description: permission.description,
          })),
      }))
      .filter((node) => node.items.length > 0);
  });

  /** Códigos que cualquier rol de empresa tiene siempre. */
  readonly lockedCodes = computed<ReadonlySet<string>>(
    () =>
      new Set(
        (this.catalog()?.permissions ?? [])
          .filter((permission) => permission.locked)
          .map((permission) => permission.code),
      ),
  );

  /** Cuenta con la que se navega: no se puede editar ni quitar a sí misma. */
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  /**
   * Si el usuario puede gestionar el equipo. El backend es la autoridad (403);
   * esto sólo evita ofrecer botones que van a fallar.
   */
  readonly canManage = computed(() => {
    const me = this.members().find((m) => m.userId === this.currentUserId());
    return me ? TEAM_MANAGER_ROLES.includes(me.companyRole) : false;
  });

  readonly stats = computed(() => {
    const list = this.members();
    return {
      total: list.length,
      owners: list.filter((m) => m.companyRole === CompanyMemberRole.OWNER)
        .length,
      recruiters: list.filter(
        (m) => m.companyRole === CompanyMemberRole.RECRUITER,
      ).length,
      pending: list.filter((m) => !m.emailVerified).length,
    };
  });

  load(): void {
    this.state.set('loading');
    this.api
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          this.members.set(members);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  add(payload: AddCompanyMemberPayload): Observable<CompanyMember> {
    // El alta puede cambiar el orden (se ordena por rol): se recarga entero.
    return this.api.add(payload).pipe(tap(() => this.load()));
  }

  updateRole(
    userId: string,
    role: CompanyMemberRole,
    accessRoleId?: string | null,
  ): Observable<CompanyMember> {
    // El contador de miembros de cada rol también cambia.
    return this.api.updateRole(userId, role, accessRoleId).pipe(
      tap(() => {
        this.load();
        this.loadRoles();
      }),
    );
  }

  loadRoles(): void {
    this.rolesState.set('loading');
    this.api
      .listRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.rolesState.set('loaded');
        },
        error: () => this.rolesState.set('error'),
      });
  }

  loadCatalog(): void {
    if (this.catalog()) return;
    this.api
      .permissionCatalog()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((catalog) => this.catalog.set(catalog));
  }

  saveRole(
    id: string | null,
    payload: SaveCompanyRolePayload,
  ): Observable<CompanyRole> {
    const request = id
      ? this.api.updateCompanyRole(id, payload)
      : this.api.createRole(payload);
    return request.pipe(tap(() => this.loadRoles()));
  }

  deleteRole(id: string): Observable<void> {
    return this.api
      .deleteRole(id)
      .pipe(
        tap(() => this.roles.update((list) => list.filter((r) => r.id !== id))),
      );
  }

  remove(userId: string): Observable<void> {
    return this.api
      .remove(userId)
      .pipe(
        tap(() =>
          this.members.update((list) =>
            list.filter((member) => member.userId !== userId),
          ),
        ),
      );
  }
}
