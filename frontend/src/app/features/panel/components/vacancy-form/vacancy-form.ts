import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PanelFacade } from '@/features/panel/data/panel.facade';
import {
  IjAutocomplete,
  IjButton,
  IjDatepicker,
  IjInput,
  IjMultiselect,
  IjOption,
  IjSelect,
} from '@/shared/ui';

/**
 * "Nueva vacante": formulario reactivo construido con los controles del UI Kit
 * (ij-input, ij-autocomplete, ij-select, ij-multiselect, ij-datepicker). Sirve
 * como ejemplo de uso de los componentes de formulario ij-*.
 */
@Component({
  selector: 'app-vacancy-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IjButton,
    IjInput,
    IjAutocomplete,
    IjSelect,
    IjMultiselect,
    IjDatepicker,
  ],
  template: `
    <form
      class="max-w-[920px] rounded-2xl bg-white p-6 shadow-card sm:p-7"
      [formGroup]="form"
      (ngSubmit)="submit()"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <ij-input
          label="Título del cargo"
          placeholder="Frontend Engineer…"
          formControlName="titulo"
        />

        <ij-autocomplete
          label="Ciudad / ubicación"
          placeholder="Escribe para buscar…"
          [suggestions]="ciudades"
          formControlName="ciudad"
        />

        <ij-select
          label="Categoría"
          placeholder="Selecciona una categoría"
          [options]="categoriaOptions()"
          formControlName="categoria"
        />

        <ij-datepicker label="Fecha de cierre" formControlName="fecha" />

        <div class="md:col-span-2">
          <ij-multiselect
            label="Habilidades requeridas"
            placeholder="Selecciona una o varias…"
            [options]="habilidadOptions()"
            formControlName="habilidades"
          />
        </div>

        <ij-select
          label="Modalidad"
          placeholder="Selecciona modalidad"
          [options]="modalidadOptions()"
          [searchable]="false"
          formControlName="modalidad"
        />

        <ij-select
          label="Tipo de empleo"
          placeholder="Selecciona tipo de empleo"
          [options]="tipoOptions()"
          [searchable]="false"
          formControlName="tipo"
        />
      </div>

      <div class="mt-7 flex justify-end gap-3 border-t border-line pt-5">
        <button
          type="button"
          class="rounded-xl border border-line bg-white px-5 py-2.5 text-[13.5px] font-bold text-body transition-colors hover:bg-surface"
          (click)="navigate.emit('vacantes')"
        >
          Cancelar
        </button>
        <button ij-button type="submit" variant="primary" shape="rounded" size="md" class="shadow-search">
          Publicar vacante
        </button>
      </div>
    </form>
  `,
})
export class VacancyForm {
  readonly navigate = output<string>();
  protected readonly facade = inject(PanelFacade);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly ciudades = this.facade.ciudades;

  protected readonly form = this.fb.group({
    titulo: '',
    ciudad: '',
    categoria: '',
    fecha: '',
    habilidades: this.fb.control<string[]>([]),
    modalidad: '',
    tipo: '',
  });

  private toOptions(values: readonly string[]): IjOption[] {
    return values.map((v) => ({ value: v, label: v }));
  }

  protected readonly categoriaOptions = computed(() =>
    this.toOptions(this.facade.categorias),
  );
  protected readonly habilidadOptions = computed(() =>
    this.toOptions(this.facade.habilidades),
  );
  protected readonly modalidadOptions = computed(() =>
    this.toOptions(this.facade.modalidades),
  );
  protected readonly tipoOptions = computed(() =>
    this.toOptions(this.facade.tipos),
  );

  protected submit(): void {
    // Demo: sin backend de vacantes todavía (M10). Se emite para volver al listado.
    this.navigate.emit('vacantes');
  }
}
