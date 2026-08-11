import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IjButton, IjOption, IjSelect } from '@/shared/ui';
import {
  ApplicationStatus,
  CompanyApplication,
} from '@/features/company/applications/models/applications.models';

/**
 * Cambio de estado de una postulación. Los estados vienen del catálogo del
 * backend (`seed:applications`), no de una lista fija: si se añade uno nuevo,
 * aparece aquí solo.
 */
@Component({
  selector: 'app-status-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IjButton, IjSelect],
  template: `
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
      >
        {{ error() }}
      </p>
    }

    <ij-select
      label="Nuevo estado"
      name="status"
      [required]="true"
      [options]="statusOptions()"
      [searchable]="false"
      [hint]="hint()"
      [(ngModel)]="status"
    />

    @if (isFinal()) {
      <p class="mt-3 rounded-lg bg-accent-amber-soft px-3 py-2 text-[12.5px] text-[#b26a15]">
        Es un estado final: después no podrás cambiarlo.
      </p>
    }

    <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
      <button
        type="button"
        class="rounded-xl border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
        (click)="cancel.emit()"
      >
        Cancelar
      </button>
      <button
        ij-button
        type="button"
        variant="primary"
        shape="rounded"
        size="md"
        [disabled]="submitting() || !status() || status() === current()"
        (click)="save.emit(status())"
      >
        {{ submitting() ? 'Guardando…' : 'Cambiar estado' }}
      </button>
    </div>
  `,
})
export class StatusForm implements OnInit {
  readonly application = input.required<CompanyApplication>();
  readonly statuses = input.required<readonly ApplicationStatus[]>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<string>();
  readonly cancel = output<void>();

  protected readonly status = signal('');

  protected readonly current = computed(
    () => this.application().status?.code ?? '',
  );

  protected readonly statusOptions = computed<readonly IjOption[]>(() =>
    [...this.statuses()]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((status) => ({ value: status.code, label: status.name })),
  );

  private readonly selected = computed(() =>
    this.statuses().find((item) => item.code === this.status()),
  );

  protected readonly isFinal = computed(() => this.selected()?.isFinal ?? false);

  protected readonly hint = computed(
    () => this.selected()?.description ?? 'El aspirante verá el cambio.',
  );

  ngOnInit(): void {
    this.status.set(this.current());
  }
}
