import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '@/core/models/api-response.models';
import { CandidateSettingsFacade } from '@/features/panel/data/candidate-settings.facade';
import {
  INFORMATION_VISIBILITY_OPTIONS,
  InformationVisibility,
  PROFILE_VISIBILITY_OPTIONS,
  ProfileVisibility,
} from '@/features/panel/models/candidate-settings.models';
import { IjIcon } from '@/shared/ui';

@Component({
  selector: 'app-candidate-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  template: `
    <div class="space-y-5">
      @if (facade.loading() && !facade.loaded()) {
        <div class="rounded-2xl border border-line bg-white p-8 text-center text-muted shadow-card">
          Cargando configuración...
        </div>
      } @else if (facade.error() && !facade.loaded()) {
        <div class="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-red-700">
          {{ facade.error() }}
        </div>
      } @else {
        <section class="rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-5 flex items-start gap-3">
            <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ij-icon name="eye" [size]="22" />
            </span>
            <div>
              <h2 class="text-lg font-bold text-ink-900">Visibilidad del perfil</h2>
              <p class="text-sm text-muted">
                Controla si tu perfil aparece en las búsquedas de las empresas.
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            @for (option of profileOptions; track option.value) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="profileVisibility() === option.value"
                [class]="optionClass(profileVisibility() === option.value)"
                (click)="profileVisibility.set(option.value)"
              >
                <span class="flex items-center justify-between">
                  <span class="text-sm font-bold text-ink-900">{{ option.label }}</span>
                  @if (profileVisibility() === option.value) {
                    <span class="text-brand"><ij-icon name="check" [size]="18" /></span>
                  }
                </span>
                <span class="mt-1 block text-[13px] text-muted">{{ option.hint }}</span>
              </button>
            }
          </div>
        </section>

        <section class="rounded-2xl bg-white p-6 shadow-card">
          <div class="mb-5 flex items-start gap-3">
            <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ij-icon name="file" [size]="22" />
            </span>
            <div>
              <h2 class="text-lg font-bold text-ink-900">Visibilidad de la información</h2>
              <p class="text-sm text-muted">
                Define cuánta información de tu perfil pueden ver las empresas.
              </p>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            @for (option of informationOptions; track option.value) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="informationVisibility() === option.value"
                [class]="optionClass(informationVisibility() === option.value)"
                (click)="informationVisibility.set(option.value)"
              >
                <span class="flex items-center justify-between">
                  <span class="text-sm font-bold text-ink-900">{{ option.label }}</span>
                  @if (informationVisibility() === option.value) {
                    <span class="text-brand"><ij-icon name="check" [size]="18" /></span>
                  }
                </span>
                <span class="mt-1 block text-[13px] text-muted">{{ option.hint }}</span>
              </button>
            }
          </div>
        </section>

        <section class="rounded-2xl bg-white p-6 shadow-card">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <ij-icon name="flash" [size]="22" />
              </span>
              <div>
                <h2 class="text-lg font-bold text-ink-900">Disponibilidad inmediata</h2>
                <p class="text-sm text-muted">
                  Indica a las empresas si puedes incorporarte de inmediato.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              [attr.aria-checked]="isImmediatelyAvailable()"
              [class]="switchClass(isImmediatelyAvailable())"
              (click)="isImmediatelyAvailable.set(!isImmediatelyAvailable())"
            >
              <span class="sr-only">Disponibilidad inmediata</span>
              <span [class]="knobClass(isImmediatelyAvailable())"></span>
            </button>
          </div>
          <p class="mt-3 text-sm font-semibold" [class]="isImmediatelyAvailable() ? 'text-accent-green' : 'text-muted'">
            {{ isImmediatelyAvailable() ? 'Disponible de inmediato' : 'Sin disponibilidad inmediata' }}
          </p>
        </section>

        @if (banner()) {
          <div
            class="rounded-xl px-4 py-3 text-sm"
            [class]="bannerTone() === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'"
          >
            {{ banner() }}
          </div>
        }

        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="saving() || !dirty()"
            (click)="save()"
          >
            <ij-icon [name]="saving() ? 'clock' : 'check'" [size]="16" />
            {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class CandidateSettingsComponent {
  protected readonly facade = inject(CandidateSettingsFacade);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profileOptions = PROFILE_VISIBILITY_OPTIONS;
  protected readonly informationOptions = INFORMATION_VISIBILITY_OPTIONS;

  protected readonly profileVisibility = signal<ProfileVisibility>('PUBLIC');
  protected readonly informationVisibility =
    signal<InformationVisibility>('FULL');
  protected readonly isImmediatelyAvailable = signal(false);

  protected readonly saving = signal(false);
  protected readonly banner = signal<string | null>(null);
  protected readonly bannerTone = signal<'success' | 'error'>('success');

  /** Habilita "Guardar" solo cuando el borrador difiere de lo persistido. */
  protected readonly dirty = computed(() => {
    const current = this.facade.settings();
    if (!current) return false;
    return (
      current.profileVisibility !== this.profileVisibility() ||
      current.informationVisibility !== this.informationVisibility() ||
      current.isImmediatelyAvailable !== this.isImmediatelyAvailable()
    );
  });

  constructor() {
    this.facade
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (settings) => this.resetDraft(settings) });
  }

  protected save(): void {
    this.saving.set(true);
    this.banner.set(null);

    this.facade
      .save({
        profileVisibility: this.profileVisibility(),
        informationVisibility: this.informationVisibility(),
        isImmediatelyAvailable: this.isImmediatelyAvailable(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.saving.set(false);
          this.resetDraft(settings);
          this.showSuccess('Configuración actualizada correctamente.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.showError(this.messageOf(error));
        },
      });
  }

  protected optionClass(active: boolean): string {
    const base =
      'rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none ' +
      'focus-visible:ring-2 focus-visible:ring-brand/40';
    return active
      ? `${base} border-brand bg-brand/5`
      : `${base} border-line hover:border-brand/30 hover:bg-surface/50`;
  }

  protected switchClass(active: boolean): string {
    const base =
      'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2';
    return active ? `${base} bg-brand` : `${base} bg-line`;
  }

  protected knobClass(active: boolean): string {
    const base =
      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform';
    return active ? `${base} translate-x-6` : `${base} translate-x-1`;
  }

  private resetDraft(settings: {
    profileVisibility: ProfileVisibility;
    informationVisibility: InformationVisibility;
    isImmediatelyAvailable: boolean;
  }): void {
    this.profileVisibility.set(settings.profileVisibility);
    this.informationVisibility.set(settings.informationVisibility);
    this.isImmediatelyAvailable.set(settings.isImmediatelyAvailable);
  }

  private showSuccess(message: string): void {
    this.bannerTone.set('success');
    this.banner.set(message);
  }

  private showError(message: string): void {
    this.bannerTone.set('error');
    this.banner.set(message);
  }

  private messageOf(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorResponse | null;
      if (body && typeof body === 'object' && 'message' in body) {
        return body.message ?? 'No fue posible guardar la configuración.';
      }
    }
    return 'No fue posible guardar la configuración.';
  }
}
