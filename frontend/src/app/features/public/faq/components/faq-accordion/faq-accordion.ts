import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  FaqCategoryId,
  FaqItem,
  FaqTab,
} from '@/features/public/faq/models/faq.models';
import { IjIcon } from '@/shared/ui';

const TAB_BASE =
  'rounded-lg px-5 py-3 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

const ITEM_BASE = 'overflow-hidden rounded-2xl border transition-colors';

const CHEVRON_BASE =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border';

/**
 * Sección FAQ del portal: tabs de categoría y acordeón de preguntas. Mantiene
 * la UI desacoplada de la lógica de selección a través de inputs/outputs.
 *
 * Las clases se calculan aquí en vez de encadenar `[class.x]` en la plantilla,
 * porque cuatro de esos enlaces llevaban una barra en el nombre
 * (`[class.bg-brand/10]`, `[class.border-brand/20]`, `[class.bg-brand/5]`) y
 * Angular no puede aplicar una clase así: no se pintaban. Las pestañas
 * inactivas se quedaban sin fondo y el acordeón abierto sin resaltar.
 */
@Component({
  selector: 'app-faq-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon],
  templateUrl: './faq-accordion.html',
})
export class FaqAccordion {
  readonly tabs = input.required<readonly FaqTab[]>();
  readonly activeTabId = input.required<FaqCategoryId>();
  readonly items = input.required<readonly FaqItem[]>();
  readonly openItemId = input<string | null>(null);

  readonly tabSelected = output<FaqCategoryId>();
  readonly itemToggled = output<string>();

  /** Activa: blanco sobre `brand-700` (4.89:1). Inactiva: `brand-strong` sobre `brand-50` (5.13:1). */
  protected tabClass(id: FaqCategoryId): string {
    return this.activeTabId() === id
      ? `${TAB_BASE} bg-brand-700 text-white shadow-float`
      : `${TAB_BASE} bg-brand-50 text-brand-strong hover:bg-brand-50/70`;
  }

  protected itemClass(id: string): string {
    return this.openItemId() === id
      ? `${ITEM_BASE} border-brand-700/30 bg-brand-50/50`
      : `${ITEM_BASE} border-line bg-white`;
  }

  protected chevronClass(id: string): string {
    return this.openItemId() === id
      ? `${CHEVRON_BASE} border-brand-700/40 text-brand-strong`
      : `${CHEVRON_BASE} border-line text-muted`;
  }
}
