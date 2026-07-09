import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { IjButton, IjIcon, TONE_SOFT } from '@/shared/ui';
import { JobSearchCriteria, Stat } from '@/features/public/home/models/home.models';
import { MediaFrame } from '@/features/public/home/components/media-frame/media-frame';

/** Hero con titular, buscador de empleos y tarjetas flotantes de estadísticas. */
@Component({
  selector: 'app-hero-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjIcon, IjButton, MediaFrame],
  templateUrl: './hero-search.html',
})
export class HeroSearch {
  readonly stats = input.required<readonly Stat[]>();
  readonly popularSearches = input.required<readonly string[]>();
  readonly categoryOptions = input.required<readonly string[]>();

  readonly search = output<JobSearchCriteria>();

  protected readonly form = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
  });

  private readonly positions = [
    'absolute left-[-6%] top-[120px] flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-float',
    'absolute right-[-4%] top-11 flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-float',
    'absolute bottom-8 right-[-2%] flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-float',
  ];

  protected cardPosition(index: number): string {
    return this.positions[index] ?? this.positions[0];
  }

  protected toneClass(tone: Stat['tone']): string {
    return TONE_SOFT[tone ?? 'brand'];
  }

  protected submit(): void {
    this.search.emit(this.form.getRawValue());
  }
}
