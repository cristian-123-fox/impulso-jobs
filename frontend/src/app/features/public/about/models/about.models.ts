import { IconName, Tone } from '@/shared/ui';

export interface AboutHeroContent {
  readonly title: string;
  readonly breadcrumbLabel: string;
}

export interface AboutCategory {
  readonly jobsLabel: string;
  readonly name: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly featured?: boolean;
}

export interface AboutStep {
  readonly num: string;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly shifted?: boolean;
}

export interface AboutCtaContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly buttonLabel: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
}

export interface AboutCompany {
  readonly name: string;
  readonly icon: IconName;
}
