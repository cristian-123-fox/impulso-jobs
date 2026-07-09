export type FaqCategoryId = 'general' | 'empleos' | 'pagos' | 'cuenta';

export interface FaqHeroContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}

export interface FaqTab {
  readonly id: FaqCategoryId;
  readonly label: string;
  readonly description: string;
}

export interface FaqItem {
  readonly id: string;
  readonly categoryId: FaqCategoryId;
  readonly question: string;
  readonly answer: string;
}
