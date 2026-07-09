import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FaqAccordion } from '@/features/public/faq/components/faq-accordion/faq-accordion';
import { FaqHero } from '@/features/public/faq/components/faq-hero/faq-hero';
import { FaqFacade } from '@/features/public/faq/data/faq.facade';
import { FaqCategoryId } from '@/features/public/faq/models/faq.models';

/**
 * Container del feature FAQ. Orquesta la categoría activa y el elemento abierto
 * del acordeón manteniendo los componentes hijos libres de lógica de estado.
 */
@Component({
  selector: 'app-faq-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaqHero, FaqAccordion],
  templateUrl: './faq-page.html',
})
export class FaqPage {
  protected readonly facade = inject(FaqFacade);

  protected readonly activeTabId = signal<FaqCategoryId>('general');
  protected readonly openItemId = signal<string | null>('general-como-funciona');

  protected readonly visibleItems = computed(() =>
    this.facade
      .items()
      .filter((item) => item.categoryId === this.activeTabId()),
  );

  protected onTabSelected(tabId: FaqCategoryId): void {
    this.activeTabId.set(tabId);
    this.openItemId.set(this.firstItemId(tabId));
  }

  protected onItemToggled(itemId: string): void {
    this.openItemId.update((current) => (current === itemId ? null : itemId));
  }

  private firstItemId(tabId: FaqCategoryId): string | null {
    return (
      this.facade.items().find((item) => item.categoryId === tabId)?.id ?? null
    );
  }
}
