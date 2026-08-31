import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CandidateResumesComponent } from '@/features/candidate/components/candidate-resumes/candidate-resumes';

@Component({
  selector: 'app-candidate-resumes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CandidateResumesComponent],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Mis hojas de vida</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Sube tus CV en PDF y elige cuál acompaña tus postulaciones.
        </p>
      </div>

      <app-candidate-resumes />
    </div>
  `,
})
export class CandidateResumesPage {}
