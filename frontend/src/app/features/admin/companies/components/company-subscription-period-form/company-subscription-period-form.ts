import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IjButton, IjDatepicker, IjTextarea } from '@/shared/ui';
import {
  AdminCompanySubscription,
  UpdateSubscriptionPayload,
} from '@/features/admin/companies/models/companies.models';

/**
 * Prórrogas y renovación automática sobre la suscripción vigente (T34).
 *
 * Mover la fecha arrastra también el cupo de la base de talento: el cupo se
 * guardó con la fecha vieja, así que sin eso una prórroga alargaría el plan y
 * dejaría a la empresa sin poder ver CVs desde el día que ya tenía.
 */
@Component({
  selector: 'app-company-subscription-period-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjDatepicker, IjTextarea],
  template: `
    <form novalidate [formGroup]="form" (ngSubmit)="onSubmit()">
      @if (error()) {
        <p
          role="alert"
          class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {{ error() }}
        </p>
      }

      <ij-datepicker
        label="Vigente hasta"
        [min]="minDate"
        hint="El cupo de la base de talento se alarga con la misma fecha."
        formControlName="currentPeriodEnd"
      />

      <label class="mt-4 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 accent-brand"
          formControlName="autoRenew"
        />
        <span class="text-[13px] text-body">
          Renovar automáticamente al vencer
        </span>
      </label>

      <div class="mt-4">
        <ij-textarea
          label="Motivo"
          [required]="true"
          [rows]="2"
          [maxLength]="500"
          hint="Queda en auditoría."
          formControlName="reason"
        />
      </div>

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
          type="submit"
          variant="primary"
          shape="rounded"
          size="md"
          [disabled]="submitting() || form.invalid"
        >
          {{ submitting() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </form>
  `,
})
export class CompanySubscriptionPeriodForm implements OnInit {
  readonly subscription = input.required<AdminCompanySubscription>();
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<UpdateSubscriptionPayload>();
  readonly cancel = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly minDate = isoDate(tomorrow());

  protected readonly form = this.fb.group({
    currentPeriodEnd: this.fb.control(''),
    autoRenew: this.fb.control(true),
    reason: this.fb.control('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(500),
    ]),
  });

  ngOnInit(): void {
    const current = this.subscription();
    this.form.patchValue({
      currentPeriodEnd: current.currentPeriodEnd
        ? current.currentPeriodEnd.slice(0, 10)
        : '',
      autoRenew: current.autoRenew,
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();

    this.save.emit({
      reason: raw.reason.trim(),
      currentPeriodEnd: raw.currentPeriodEnd
        ? `${raw.currentPeriodEnd}T23:59:59.000Z`
        : undefined,
      autoRenew: raw.autoRenew,
    });
  }
}

function tomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
