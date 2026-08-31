import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CandidateProfileComponent } from '@/features/candidate/components/candidate-profile/candidate-profile';

@Component({
  selector: 'app-candidate-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CandidateProfileComponent],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Mi perfil</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Tu información profesional: es lo que verán las empresas cuando te postules.
        </p>
      </div>

      <app-candidate-profile />
    </div>
  `,
})
export class CandidateProfilePage {}
