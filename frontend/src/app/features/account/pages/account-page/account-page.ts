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
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@/core/auth/auth.service';
import { LocaleFormatService } from '@/core/i18n/locale-format.service';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { ROLE_LABELS, Role } from '@/core/models/role.enum';
import { IjIcon } from '@/shared/ui';
import { AccountApi } from '@/features/account/data/account.api';
import { AccountIdentityForm } from '@/features/account/components/account-identity-form/account-identity-form';
import { AccountPasswordForm } from '@/features/account/components/account-password-form/account-password-form';
import { AccountPhoto } from '@/features/account/components/account-photo/account-photo';
import {
  AccountProfile,
  ChangePasswordPayload,
  UpdateAccountProfilePayload,
} from '@/features/account/models/account.models';

/**
 * Dónde edita su identidad un rol cuyo nombre **no** vive en `users`. Un
 * candidato tiene su nombre, su teléfono y su foto en `candidate_profiles`, y
 * es de ahí de donde los lee todo lo demás (`UserProfileResolver`), así que
 * ofrecerle aquí los mismos campos dejaría dos orígenes para el mismo dato y
 * el que escribiera aquí no se vería en ningún sitio.
 */
const IDENTITY_ELSEWHERE: Partial<Record<Role, { label: string; route: string }>> = {
  [Role.CANDIDATE]: { label: 'Perfil del aspirante', route: '/candidato/perfil' },
};

/**
 * «Mi cuenta»: la identidad, el acceso y la contraseña del usuario conectado.
 *
 * Es una sola página para las tres áreas — `/admin`, `/empresa` y `/candidato`
 * la montan con su propio layout — porque `/account/**` no lleva id: el
 * backend resuelve el titular desde el token, así que no hay nada que cambie
 * por área salvo el rol, y de eso se encarga `identityElsewhere`.
 */
@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    IjIcon,
    AccountIdentityForm,
    AccountPasswordForm,
    AccountPhoto,
  ],
  template: `
    <div class="mx-auto flex max-w-[860px] flex-col gap-5">
      <div>
        <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">
          Mi cuenta
        </h1>
        <p class="mt-1.5 text-[14px] font-medium text-muted">
          Tus datos de acceso y cómo te ve el resto de la plataforma.
        </p>
      </div>

      @switch (state()) {
        @case ('loading') {
          <div
            role="status"
            aria-label="Cargando tu cuenta…"
            class="h-64 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none"
          ></div>
        }
        @case ('error') {
          <div
            role="alert"
            class="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-6 py-12 text-center"
          >
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ij-icon name="alert-triangle" [size]="22" [strokeWidth]="1.9" />
            </span>
            <p class="text-[13.5px] font-semibold text-ink-900">
              No se pudo cargar tu cuenta.
            </p>
            <button
              type="button"
              class="mt-1 rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface active:translate-y-px"
              (click)="load()"
            >
              Reintentar
            </button>
          </div>
        }
        @default {
          @if (profile(); as account) {
            <section class="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 class="text-[15px] font-extrabold text-ink-900">Identidad</h2>

              @if (identityElsewhere(); as elsewhere) {
                <p class="mt-1 text-[13px] text-muted">
                  Tu nombre, tu teléfono y tu foto viven en tu perfil, que es de
                  donde los lee el resto de la plataforma.
                </p>
                <a
                  [routerLink]="elsewhere.route"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13.5px] font-bold text-brand-strong transition-colors hover:bg-brand-50"
                >
                  Ir a {{ elsewhere.label }}
                  <ij-icon name="chevron-right" [size]="15" [strokeWidth]="2.2" />
                </a>
              } @else {
                <p class="mt-1 text-[13px] text-muted">
                  Cómo apareces en la plataforma.
                </p>

                <div class="mt-5 flex flex-col gap-5">
                  <app-account-photo
                    [photoUrl]="account.photoUrl"
                    [name]="fullName() || account.email"
                    [busy]="photoBusy()"
                    (select)="onPhoto($event)"
                    (remove)="onRemovePhoto()"
                  />
                  @if (photoError(); as message) {
                    <p role="alert" class="text-[12.5px] font-semibold text-red-700">
                      {{ message }}
                    </p>
                  }
                  <app-account-identity-form
                    [profile]="account"
                    [submitting]="savingIdentity()"
                    [saved]="identitySaved()"
                    [error]="identityError()"
                    (save)="onSaveIdentity($event)"
                  />
                </div>
              }
            </section>

            <section class="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 class="text-[15px] font-extrabold text-ink-900">Acceso</h2>
              <p class="mt-1 text-[13px] text-muted">
                El correo es tu identidad de acceso y no se cambia desde aquí:
                hacerlo sin volver a verificarlo convertiría una sesión robada en
                una toma de la cuenta. Escríbenos si necesitas cambiarlo.
              </p>

              <dl class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Correo
                  </dt>
                  <dd class="mt-1 flex flex-wrap items-center gap-2">
                    <span class="break-all text-[14px] font-semibold text-ink-900">
                      {{ account.email }}
                    </span>
                    @if (account.emailVerified) {
                      <span
                        class="rounded-full bg-accent-green-soft px-2.5 py-1 text-[12px] font-bold text-accent-green-strong"
                      >
                        Verificado
                      </span>
                    } @else {
                      <span
                        class="rounded-full bg-accent-amber-soft px-2.5 py-1 text-[12px] font-bold text-accent-amber-strong"
                      >
                        Sin verificar
                      </span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Rol
                  </dt>
                  <dd class="mt-1 text-[14px] font-semibold text-ink-900">
                    {{ roleLabel(account.role) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Cuenta creada
                  </dt>
                  <dd class="mt-1 text-[14px] font-semibold text-ink-900">
                    {{ date(account.createdAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-[12px] font-bold uppercase tracking-wide text-muted">
                    Último acceso
                  </dt>
                  <dd class="mt-1 text-[14px] font-semibold text-ink-900">
                    {{ account.lastLogin ? date(account.lastLogin) : 'Sin registro' }}
                  </dd>
                </div>
              </dl>
            </section>

            <section class="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <h2 class="text-[15px] font-extrabold text-ink-900">Contraseña</h2>
              <p class="mt-1 text-[13px] text-muted">
                Pedimos la actual para confirmar que eres tú.
              </p>
              <div class="mt-5">
                <app-account-password-form
                  [submitting]="savingPassword()"
                  [error]="passwordError()"
                  (save)="onChangePassword($event)"
                />
              </div>
            </section>
          }
        }
      }
    </div>
  `,
})
export class AccountPage {
  private readonly api = inject(AccountApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly locale = inject(LocaleFormatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = signal<AccountProfile | null>(null);
  protected readonly state = signal<'loading' | 'loaded' | 'error'>('loading');

  protected readonly savingIdentity = signal(false);
  protected readonly identitySaved = signal(false);
  protected readonly identityError = signal<string | null>(null);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly fullName = computed(() => {
    const account = this.profile();
    if (!account) return '';
    return `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim();
  });

  protected readonly identityElsewhere = computed(() => {
    const role = this.profile()?.role;
    return role ? (IDENTITY_ELSEWHERE[role] ?? null) : null;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.api
      .profile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account) => {
          this.profile.set(account);
          this.state.set('loaded');
        },
        error: () => this.state.set('error'),
      });
  }

  protected onSaveIdentity(payload: UpdateAccountProfilePayload): void {
    if (Object.keys(payload).length === 0) {
      this.identitySaved.set(true);
      return;
    }

    this.savingIdentity.set(true);
    this.identitySaved.set(false);
    this.identityError.set(null);
    this.api
      .update(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account) => {
          this.savingIdentity.set(false);
          this.identitySaved.set(true);
          this.profile.set(account);
          this.refreshSessionIdentity();
        },
        error: (error: unknown) => {
          this.savingIdentity.set(false);
          this.identityError.set(
            this.messageOf(error, 'No se pudieron guardar los cambios.'),
          );
        },
      });
  }

  protected onPhoto(file: File): void {
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ photoUrl }) => {
          this.photoBusy.set(false);
          this.patch({ photoUrl });
          this.refreshSessionIdentity();
        },
        error: (error: unknown) => {
          this.photoBusy.set(false);
          this.photoError.set(
            this.messageOf(error, 'No se pudo subir la foto.'),
          );
        },
      });
  }

  protected onRemovePhoto(): void {
    this.photoBusy.set(true);
    this.photoError.set(null);
    this.api
      .removePhoto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.photoBusy.set(false);
          this.patch({ photoUrl: null });
          this.refreshSessionIdentity();
        },
        error: (error: unknown) => {
          this.photoBusy.set(false);
          this.photoError.set(
            this.messageOf(error, 'No se pudo quitar la foto.'),
          );
        },
      });
  }

  /**
   * El backend invalida todas las sesiones al cambiar la contraseña, así que
   * el token con el que se hizo esta petición ya no vale: se cierra sesión en
   * cliente y se manda al login. `logout()` sirve igual aunque su llamada a la
   * API falle — se traga el error y limpia el almacenamiento de todos modos.
   */
  protected onChangePassword(payload: ChangePasswordPayload): void {
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.api
      .changePassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.auth
            .logout()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() =>
              void this.router.navigate(['/auth/login'], {
                queryParams: { passwordChanged: 1 },
              }),
            );
        },
        error: (error: unknown) => {
          this.savingPassword.set(false);
          this.passwordError.set(
            this.messageOf(error, 'No se pudo cambiar la contraseña.'),
          );
        },
      });
  }

  protected roleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected date(value: string): string {
    return this.locale.shortDate(value);
  }

  private patch(changes: Partial<AccountProfile>): void {
    const account = this.profile();
    if (account) this.profile.set({ ...account, ...changes });
  }

  /**
   * La cabecera pinta lo que devolvió `GET /auth/me`, que se cachea por carga
   * de la app: sin volver a pedirlo, el nombre o la foto recién guardados no
   * aparecerían hasta recargar.
   */
  private refreshSessionIdentity(): void {
    this.auth
      .reloadIdentity()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** El backend ya envía mensajes en español; se usa el suyo cuando existe. */
  private messageOf(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      return body?.errors?.[0]?.message ?? body?.message ?? fallback;
    }
    return fallback;
  }
}
