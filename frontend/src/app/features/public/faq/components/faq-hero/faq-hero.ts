import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaqHeroContent } from '@/features/public/faq/models/faq.models';

/**
 * Hero interno para la vista de preguntas frecuentes con breadcrumb y fondo
 * suave consistente con el resto del portal público.
 */
@Component({
  selector: 'app-faq-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './faq-hero.html',
})
export class FaqHero {
  readonly content = input.required<FaqHeroContent>();
}
