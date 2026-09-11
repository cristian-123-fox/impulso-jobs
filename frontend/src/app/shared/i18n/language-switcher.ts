import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  LANGUAGE_LABELS,
  Language,
  SUPPORTED_LANGUAGES,
} from '@/core/i18n/i18n.config';
import { LanguageService } from '@/core/i18n/language.service';

/**
 * Selector de idioma (T26). Con dos idiomas un desplegable sobra: se pintan
 * como un par de pastillas, que además dejan ver el idioma activo sin abrir
 * nada. Si algún día hay más de tres, esto pasa a `ij-select`.
 *
 * Cambiar de idioma no navega ni recarga: reescribe la cookie y Transloco
 * repinta las vistas.
 */
@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `
    <div
      *transloco="let t"
      class="flex items-center gap-0.5 rounded-full border border-line p-0.5"
      role="group"
      [attr.aria-label]="t('language.change')"
    >
      @for (lang of options; track lang) {
        <button
          type="button"
          class="rounded-full px-2 py-0.5 text-[12px] font-bold uppercase transition-colors"
          [class]="
            lang === i18n.current()
              ? 'bg-brand-50 text-brand'
              : 'text-muted hover:text-body'
          "
          [attr.aria-pressed]="lang === i18n.current()"
          [attr.lang]="lang"
          [title]="labels[lang]"
          (click)="i18n.use(lang)"
        >
          {{ lang }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(LanguageService);
  protected readonly options: readonly Language[] = SUPPORTED_LANGUAGES;
  protected readonly labels = LANGUAGE_LABELS;
}
