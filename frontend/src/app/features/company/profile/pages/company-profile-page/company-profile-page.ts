import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CompanyProfileComponent } from '@/features/panel/components/company-profile/company-profile';

/**
 * Perfil de la empresa dentro de su propia área. Reutiliza el componente que
 * ya existía en el panel —siempre pegó a la API real (`/company/profile`)—; lo
 * único que faltaba era una ruta propia fuera del prototipo.
 */
@Component({
  selector: 'app-company-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompanyProfileComponent],
  template: `
    <div class="mx-auto max-w-[1180px]">
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold tracking-tight text-ink-900">Perfil de empresa</h1>
        <p class="mt-1.5 text-[13.5px] text-muted">
          Datos fiscales y de contacto. Es lo que verán los aspirantes en tus vacantes.
        </p>
      </div>

      <app-company-profile />
    </div>
  `,
})
export class CompanyProfilePage {}
