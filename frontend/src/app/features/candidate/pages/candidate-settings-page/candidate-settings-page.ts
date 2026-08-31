import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CandidateSettingsComponent } from '@/features/candidate/components/candidate-settings/candidate-settings';

@Component({
  selector: 'app-candidate-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CandidateSettingsComponent],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Configuración</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Controla la visibilidad de tu perfil y tu disponibilidad ante las empresas.
        </p>
      </div>

      <app-candidate-settings />
    </div>
  `,
})
export class CandidateSettingsPage {}
