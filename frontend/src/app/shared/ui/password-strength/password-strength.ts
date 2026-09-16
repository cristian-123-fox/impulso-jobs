import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IjIcon } from '@/shared/ui/icon/icon';

interface PasswordRule {
  readonly label: string;
  readonly test: (value: string) => boolean;
}

/**
 * Las cinco condiciones de `passwordPolicyValidator`, una por una. El validador
 * es un único regex que sólo sabe decir sí o no; aquí se desglosa para poder
 * señalar **cuál** falta. Si cambia la política, cambian los dos.
 */
const RULES: readonly PasswordRule[] = [
  { label: '8+ caracteres', test: (value) => value.length >= 8 },
  { label: 'Mayúscula', test: (value) => /[A-Z]/.test(value) },
  { label: 'Minúscula', test: (value) => /[a-z]/.test(value) },
  { label: 'Número', test: (value) => /\d/.test(value) },
  { label: 'Símbolo', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

/**
 * Medidor de la contraseña: barra de fuerza y desglose de la política.
 *
 * Es informativo, no valida: quien decide si el formulario se puede enviar
 * sigue siendo `passwordPolicyValidator` sobre el control. Sirve para que
 * escribir una contraseña no sea un juego de adivinar por qué el campo está
 * en rojo. Lo usan el alta de usuario del back-office y el cambio de
 * contraseña de «Mi cuenta».
 */
@Component({
  selector: 'ij-password-strength',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-2">
      <div class="flex gap-1" role="presentation">
        @for (bar of bars(); track $index) {
          <span class="h-1 flex-1 rounded-full transition-colors" [class]="bar"></span>
        }
      </div>
      <p class="sr-only" aria-live="polite">{{ summary() }}</p>
      <div class="flex flex-wrap gap-x-3 gap-y-1.5">
        @for (rule of rules(); track rule.label) {
          <span
            class="inline-flex items-center gap-1 text-[11.5px] font-semibold"
            [class]="rule.passed ? 'text-accent-green-strong' : 'text-muted'"
          >
            <span
              class="flex h-3.5 w-3.5 items-center justify-center rounded-full text-white"
              [class]="rule.passed ? 'bg-accent-green' : 'bg-line'"
            >
              <ij-icon name="check" [size]="9" [strokeWidth]="4" />
            </span>
            {{ rule.label }}
          </span>
        }
      </div>
    </div>
  `,
})
export class IjPasswordStrength {
  readonly value = input<string>('');

  protected readonly rules = computed(() => {
    const value = this.value() ?? '';
    return RULES.map((rule) => ({ label: rule.label, passed: rule.test(value) }));
  });

  private readonly passed = computed(
    () => this.rules().filter((rule) => rule.passed).length,
  );

  protected readonly summary = computed(() => {
    const missing = this.rules().filter((rule) => !rule.passed).length;
    return missing === 0
      ? 'La contraseña cumple la política.'
      : `Faltan ${missing} requisitos de la contraseña.`;
  });

  /**
   * Cuatro tramos para cinco reglas: la primera regla sola no basta para pintar
   * nada, así que el primer tramo se enciende a partir de dos cumplidas.
   */
  protected readonly bars = computed(() => {
    const passed = this.passed();
    const tone =
      passed <= 2
        ? 'bg-red-500'
        : passed <= 4
          ? 'bg-accent-amber'
          : 'bg-accent-green';
    return [0, 1, 2, 3].map((index) =>
      this.value() && passed >= index + 2 ? tone : 'bg-line',
    );
  });
}
