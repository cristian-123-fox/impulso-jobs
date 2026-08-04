import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Role } from '@/core/models/role.enum';
import { UsersApi } from '@/features/admin/users/data/users.api';
import {
  AdminUser,
  CreateUserPayload,
  UpdateUserPayload,
  UserStats,
  UserStatus,
  UsersFilters,
} from '@/features/admin/users/models/users.models';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const PAGE_SIZE = 10;

const EMPTY_STATS: UserStats = {
  total: 0,
  admins: 0,
  employers: 0,
  candidates: 0,
  inactive: 0,
};

/** Fachada del feature admin/usuarios: filtros + paginación con Signals. */
@Injectable()
export class UsersFacade {
  private readonly api = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<AdminUser[]>([]);
  readonly stats = signal<UserStats>(EMPTY_STATS);
  readonly state = signal<LoadState>('idle');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pages = signal(1);

  readonly search = signal('');
  /** Pestaña activa: el listado siempre está separado por tipo de cuenta. */
  readonly role = signal<Role>(Role.EMPLOYER);
  readonly status = signal<UserStatus | ''>('');

  readonly hasFilters = computed(
    () => Boolean(this.search()) || Boolean(this.status()),
  );

  load(page = this.page()): void {
    this.state.set('loading');
    this.page.set(page);

    const filters: UsersFilters = {
      page,
      limit: PAGE_SIZE,
      role: this.role(),
    };
    if (this.search().trim()) filters.search = this.search().trim();
    if (this.status()) filters.status = this.status() as UserStatus;

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.users.set(result.items);
          this.stats.set(result.stats);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  /** Aplica filtros volviendo siempre a la primera página. */
  applyFilters(): void {
    this.load(1);
  }

  /** Cambia de pestaña conservando la búsqueda, pero no el estado ni la página. */
  selectRole(role: Role): void {
    if (role === this.role()) return;
    this.role.set(role);
    this.status.set('');
    this.load(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('');
    this.load(1);
  }

  create(payload: CreateUserPayload): Observable<AdminUser> {
    return this.api.create(payload);
  }

  update(id: string, payload: UpdateUserPayload): Observable<AdminUser> {
    return this.api.update(id, payload);
  }

  setRoles(id: string, roleIds: string[]): Observable<AdminUser> {
    return this.api.setRoles(id, roleIds);
  }

  updateStatus(id: string, status: UserStatus): Observable<AdminUser> {
    return this.api.updateStatus(id, status);
  }

  remove(id: string): Observable<void> {
    return this.api.remove(id);
  }

  /** Sustituye una fila tras editarla, sin recargar la página completa. */
  replace(user: AdminUser): void {
    this.users.update((list) =>
      list.map((item) => (item.id === user.id ? user : item)),
    );
  }
}
