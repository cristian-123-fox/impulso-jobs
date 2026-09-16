import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CandidateSettingsComponent } from '@/features/candidate/components/candidate-settings/candidate-settings';

@Component({
  selector: 'app-candidate-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CandidateSettingsComponent],
  template: `
    <div class="mx-auto max-w-[1240px]">
      <div class="mb-6">
        <h1 class="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900">Configuración</h1>
        <p class="mt-1.5 text-[14px] font-medium text-muted">
          Controla la visibilidad de tu perfil y tu disponibilidad ante las empresas.
        </p>
      </div>

      <app-candidate-settings />
    </div>
  `,
})
export class CandidateSettingsPage {}
