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

/**
 * Sección FAQ del portal: tabs de categoría y acordeón de preguntas. Mantiene
 * la UI desacoplada de la lógica de selección a través de inputs/outputs.
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
}
