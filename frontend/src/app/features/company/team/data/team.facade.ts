import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import { AuthService } from '@/core/auth/auth.service';
import { TeamApi } from '@/features/company/team/data/team.api';
import {
  AddCompanyMemberPayload,
  CompanyMember,
  CompanyMemberRole,
  TEAM_MANAGER_ROLES,
} from '@/features/company/team/models/team.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Fachada del equipo de la empresa: estado con Signals + acciones. */
@Injectable()
export class TeamFacade {
  private readonly api = inject(TeamApi);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly members = signal<CompanyMember[]>([]);
  readonly state = signal<LoadState>('idle');

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
  ): Observable<CompanyMember> {
    return this.api.updateRole(userId, role).pipe(tap(() => this.load()));
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
