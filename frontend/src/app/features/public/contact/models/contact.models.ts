import { IconName } from '@/shared/ui';

export interface ContactHeroContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}

export interface ContactInfoCard {
  readonly icon: IconName;
  readonly title: string;
  readonly lines: readonly string[];
}

export interface ContactMapLocation {
  readonly badgeTitle: string;
  readonly badgeAddress: string;
  readonly officeName: string;
  readonly officeAddress: string;
}

export interface ContactFormValue {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly subject: string;
  readonly message: string;
}
