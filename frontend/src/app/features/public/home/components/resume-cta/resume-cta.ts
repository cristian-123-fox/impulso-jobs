import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IjButton, IjIcon } from '@/shared/ui';
import { MediaFrame } from '../media-frame/media-frame';

/** Banner CTA: invita a subir la hoja de vida. */
@Component({
  selector: 'app-resume-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IjIcon, IjButton, MediaFrame],
  template: `
    <section class="px-6 py-16 lg:px-[60px]">
      <div
        class="mx-auto grid max-w-[1120px] items-end gap-0 lg:grid-cols-[1fr_1.05fr]"
      >
        <div class="relative hidden h-[400px] overflow-hidden rounded-t-xl lg:block">
          <app-media-frame icon="user" label="Foto" />
        </div>
        <div class="relative rounded-xl bg-brand px-8 py-12 text-white lg:-top-8 lg:px-12">
          <p class="mb-3.5 text-sm font-medium opacity-90">Explora una nueva vida</p>
          <h2 class="mb-5 text-2xl font-bold leading-snug text-white sm:text-[34px]">
            No solo busques: deja que te encuentren poniendo tu hoja de vida frente
            a grandes empresas
          </h2>
          <p class="mb-8 max-w-[460px] text-sm leading-relaxed opacity-90">
            Crea tu perfil, sube tu hoja de vida y recibe ofertas de las empresas
            que buscan talento como el tuyo.
          </p>
          <a ij-button href="#" variant="white" size="md" class="font-semibold">
            Sube tu hoja de vida
            <ij-icon name="arrow-up" [size]="15" />
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ResumeCta {}
