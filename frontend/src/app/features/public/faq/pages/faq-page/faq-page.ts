import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FaqAccordion } from '@/features/public/faq/components/faq-accordion/faq-accordion';
import { FaqFacade } from '@/features/public/faq/data/faq.facade';
import { FaqCategoryId } from '@/features/public/faq/models/faq.models';
import { IjPageHeader } from '@/shared/ui';
import { SeoService } from '@/core/services/seo.service';

/**
 * Container del feature FAQ. Orquesta la categoría activa y el elemento abierto
 * del acordeón manteniendo los componentes hijos libres de lógica de estado.
 */
@Component({
  selector: 'app-faq-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjPageHeader, FaqAccordion],
  templateUrl: './faq-page.html',
})
export class FaqPage {
  protected readonly facade = inject(FaqFacade);

  protected readonly activeTabId = signal<FaqCategoryId>('general');
  protected readonly openItemId = signal<string | null>('general-como-funciona');

  constructor() {
    inject(SeoService).setPage({
      title: 'Preguntas frecuentes | Impulso Jobs',
      description:
        'Dudas sobre vacantes, postulaciones, planes y tu cuenta en Impulso Jobs, respondidas.',
      canonicalPath: '/faq',
    });
  }

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
