import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  LegalDocCode,
  legalDocument,
  versionOf,
} from '@/shared/catalogs/legal.catalogs';
import { IjIcon } from '@/shared/ui';

/** Un documento tal y como se declaró que se acepta. */
export interface LegalAcceptanceValue {
  readonly code: LegalDocCode;
  readonly version: string;
  readonly granted: boolean;
}

/** Lo que emite el componente cuando cambia cualquiera de las casillas. */
export interface LegalConsentChange {
  readonly documents: readonly LegalAcceptanceValue[];
  readonly marketing: boolean;
  readonly imageRights: boolean;
}

const DEFAULT_REQUIRED: readonly LegalDocCode[] = [
  LegalDocCode.TERMS,
  LegalDocCode.PRIVACY,
];

/**
 * Las casillas de consentimiento legal de un formulario.
 *
 * ## Por qué un componente y no un `@if` por pantalla
 *
 * Once formularios necesitan exactamente esto, y lo que importa no es el
 * aspecto sino tres reglas que se pueden violar sin darse cuenta:
 *
 * 1. **La casilla obligatoria nunca viene marcada.** No hay estado inicial que
 *    alguien pueda activar por descuido: el `checked` del `<input>` sale del
 *    signal, que arranca en `false` y sólo cambia con un `change` real.
 * 2. **La versión que se declara es la que el catálogo dice vigente.** La
 *    resuelve `versionOf()` aquí, no la pasa el padre, así que once pantallas no
 *    pueden quedar cada una con una versión distinta.
 * 3. **Lo que se rechaza también se declara.** La casilla de comunicaciones
 *    comerciales va siempre en la lista, marcada o no: que a alguien se le
 *    ofreciera el newsletter y lo declinara es justamente lo que demuestra que
 *    la casilla no venía marcada por el sistema.
 *
 * ## Por qué la casilla de marketing es distinta y no una más
 *
 * La ley separa las cosas: los Términos y el Aviso son **necesarios** (sin
 * ellos no hay contrato — art. 7 y 16 LFPDPPP) y las comunicaciones comerciales
 * son una **finalidad accesoria** que el art. 15 fr. III obliga a distinguir y
 * que nadie puede imponer. Presentarlas como dos casillas iguales sería
 * exactamente el defecto que esa fracción busca evitar.
 *
 * ## Nota sobre la huella del texto
 *
 * Este componente **no** calcula un SHA-256 del contenido. `legal_consents` tiene
 * la columna y la acepta, pero llenarla exigiría `crypto.subtle`, que sólo
 * existe en contexto seguro y además es asíncrono — con lo que la casilla y el
 * envío acabarían compitiendo. La evidencia que de verdad se mira en una
 * verificación es la tríada **versión + fecha + IP**, y las tres quedan fijadas.
 */
@Component({
  selector: 'ij-legal-consent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink, IjIcon],
  template: `
    <div class="flex flex-col gap-2.5" *transloco="let t">
      <!-- Obligatoria: Términos + Aviso -->
      <label class="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug"
        [class]="labelClass()">
        <input
          type="checkbox"
          class="mt-[3px] h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] border-muted bg-white text-brand focus:ring-2 focus:ring-brand-600"
          [checked]="requiredChecked()"
          (change)="onRequiredChange($event)"
        />
        <span>
          {{ t('legal.consent.requiredLabel') }}
          <a
            [routerLink]="routeOf(LegalDocCode.TERMS)"
            target="_blank"
            rel="noopener"
            [class]="linkClass()"
            >{{ t(titleKeyOf(LegalDocCode.TERMS)) }}</a
          >
          {{ t('legal.consent.and') }}
          <a
            [routerLink]="routeOf(LegalDocCode.PRIVACY)"
            target="_blank"
            rel="noopener"
            [class]="linkClass()"
            >{{ t(titleKeyOf(LegalDocCode.PRIVACY)) }}</a
          >
          <span [class]="noteClass()">{{ versionNote() }}</span>
        </span>
      </label>

      <!-- Accesoria: comunicaciones comerciales -->
      @if (showMarketing()) {
        <label class="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug"
          [class]="labelClass()">
          <input
            type="checkbox"
            class="mt-[3px] h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] border-muted bg-white text-brand focus:ring-2 focus:ring-brand-600"
            [checked]="marketingChecked()"
            (change)="onMarketingChange($event)"
          />
          <span>
            {{ t('legal.consent.marketingLabel') }}
            <a
              [routerLink]="routeOf(LegalDocCode.MARKETING)"
              target="_blank"
              rel="noopener"
              [class]="linkClass()"
              >{{ t(titleKeyOf(LegalDocCode.MARKETING)) }}</a
            >
          </span>
        </label>
      }

      <!-- Opcional: cesión de derechos de imagen -->
      @if (imageRights()) {
        <label class="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug"
        [class]="labelClass()">
          <input
            type="checkbox"
            class="mt-[3px] h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] border-muted bg-white text-brand focus:ring-2 focus:ring-brand-600"
            [checked]="imageChecked()"
            (change)="onImageChange($event)"
          />
          <span>
            {{ t('legal.consent.imageLabel') }}
            <a
              [routerLink]="routeOf(LegalDocCode.IMAGE_RIGHTS)"
              target="_blank"
              rel="noopener"
              [class]="linkClass()"
              >{{ t(titleKeyOf(LegalDocCode.IMAGE_RIGHTS)) }}</a
            >
          </span>
        </label>
      }

      @if (error(); as message) {
        <p
          class="flex items-start gap-2 text-[13px] font-medium leading-snug text-accent-pink-strong"
          role="alert"
        >
          <ij-icon name="alert-triangle" class="mt-0.5 h-4 w-4 shrink-0" />
          <span>{{ message }}</span>
        </p>
      }
    </div>
  `,
})
export class IjLegalConsent {
  /** Documentos sin los que no hay servicio. Base: Términos + Aviso. */
  readonly requiredDocuments = input<readonly LegalDocCode[] | undefined>(
    undefined,
  );

  /** Documentos adicionales a declarar (p. ej. cookies en el banner). */
  readonly extraDocuments = input<readonly LegalDocCode[]>([]);

  /**
   * Superficie donde se dibuja.
   *
   * El pie de página es oscuro y, con los tokens de fondo claro, este texto
   * quedaba ilegible: `text-body` es `#35354a` sobre un azul casi negro. Por eso
   * el componente pregunta en qué fondo está en vez de suponer que es claro.
   */
  readonly tone = input<'light' | 'dark'>('light');

  protected readonly labelClass = computed(() =>
    this.tone() === 'dark' ? 'text-footer-fg' : 'text-body',
  );
  protected readonly noteClass = computed(() =>
    this.tone() === 'dark' ? 'text-footer-muted' : 'text-muted',
  );
  protected readonly linkClass = computed(() =>
    this.tone() === 'dark'
      ? 'font-medium text-white underline decoration-footer-muted underline-offset-2 hover:decoration-white'
      : 'font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink',
  );

  /** Muestra la casilla de cesión de imagen (candidato con fotografía). */
  readonly imageRights = input<boolean>(false);

  /**
   * Muestra la casilla opcional de comunicaciones comerciales. En el registro
   * se oculta: el alta sólo debe pedir el consentimiento necesario de Términos
   * y Aviso, no una finalidad accesoria.
   */
  readonly showMarketing = input<boolean>(true);

  readonly consentChange = output<LegalConsentChange>();

  protected readonly requiredChecked = signal(false);
  protected readonly marketingChecked = signal(false);
  protected readonly imageChecked = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly LegalDocCode = LegalDocCode;

  private readonly requiredCodes = computed(
    () => this.requiredDocuments() ?? DEFAULT_REQUIRED,
  );

  /** `«Términos y condiciones» (1.0.0 · 2026-10-01)` */
  protected readonly versionNote = computed(() => {
    const version = versionOf(LegalDocCode.TERMS);
    return ` (${version} · ${legalDocument(LegalDocCode.TERMS).effectiveDate})`;
  });

  /**
   * Lo que se enviará a `POST /legal/consents`.
   *
   * `computed` y no un método: así el padre puede leerlo en cualquier momento
   * (en `ngOnInit`, en el `submit`) sin que quede desincronizado con las
   * casillas.
   */
  readonly acceptance = computed<LegalAcceptanceValue[]>(() => {
    const values: LegalAcceptanceValue[] = [];
    const seen = new Set<LegalDocCode>();

    for (const code of [...this.requiredCodes(), ...this.extraDocuments()]) {
      if (seen.has(code)) continue;
      seen.add(code);
      values.push({
        code,
        version: versionOf(code),
        // Extras y opcionales se dan por concedidos: quien los presenta es el
        // formulario, que ya mostró el texto. Los bloqueantes, no.
        granted: this.requiredCodes().includes(code)
          ? this.requiredChecked()
          : true,
      });
    }

    values.push({
      code: LegalDocCode.MARKETING,
      version: versionOf(LegalDocCode.MARKETING),
      granted: this.marketingChecked(),
    });

    if (this.imageRights()) {
      values.push({
        code: LegalDocCode.IMAGE_RIGHTS,
        version: versionOf(LegalDocCode.IMAGE_RIGHTS),
        granted: this.imageChecked(),
      });
    }

    return values;
  });

  protected routeOf(code: LegalDocCode): string {
    return legalDocument(code).route;
  }

  protected titleKeyOf(code: LegalDocCode): string {
    return legalDocument(code).titleKey;
  }

  protected onRequiredChange(event: Event): void {
    this.requiredChecked.set((event.target as HTMLInputElement).checked);
    this.error.set(null);
    this.emit();
  }

  protected onMarketingChange(event: Event): void {
    this.marketingChecked.set((event.target as HTMLInputElement).checked);
    this.emit();
  }

  protected onImageChange(event: Event): void {
    this.imageChecked.set((event.target as HTMLInputElement).checked);
    this.emit();
  }

  private emit(): void {
    this.consentChange.emit({
      documents: this.acceptance(),
      marketing: this.marketingChecked(),
      imageRights: this.imageChecked(),
    });
  }

  /**
   * Lo consulta el padre antes de enviar. Si la obligatoria no está marcada
   * devuelve `false` y deja el error visible; si está, lo limpia.
   */
  validate(message: string): boolean {
    if (this.requiredChecked()) {
      this.error.set(null);
      return true;
    }
    this.error.set(message);
    return false;
  }

  /** ¿Están marcadas las casillas necesarias para este formulario? */
  get satisfied(): boolean {
    if (this.requiredCodes().length > 0 && !this.requiredChecked()) return false;
    // Con cesión de imagen, no autorizar significa subir sin publicar la foto:
    // es una decisión válida, así que no bloquea.
    return true;
  }
}