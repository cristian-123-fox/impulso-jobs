import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ContactFormValue,
  ContactInfoCard,
} from '@/features/public/contact/models/contact.models';
import { IjButton, IjIcon, IjInput, IjTextarea } from '@/shared/ui';
import { BRAND_EMAILS } from '@/shared/catalogs/brand.catalogs';

/**
 * Sección principal de contacto: formulario reactivo tipado + canales de apoyo.
 * El componente no conoce servicios de datos y solo emite el payload al padre.
 */
@Component({
  selector: 'app-contact-form-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IjButton, IjIcon, IjInput, IjTextarea],
  template: `
    <section class="px-6 py-20 lg:px-[60px]">
      <div
        class="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]"
      >
        <div>
          <p class="mb-2 text-[15px] font-semibold text-brand-strong">Envíanos un mensaje</p>
          <h2 class="text-4xl font-bold leading-tight text-ink-900 sm:text-[42px]">
            Cuéntanos cómo podemos ayudarte
          </h2>
          <p class="mt-4 max-w-[680px] text-[15px] leading-7 text-muted">
            Resolvemos dudas de candidatos y empresas. Al enviar se abre tu
            gestor de correo con el mensaje ya redactado.
          </p>

          @if (statusMessage()) {
            <div
              class="mt-6 rounded-xl border border-accent-green/25 bg-accent-green-soft px-5 py-4 text-sm leading-relaxed text-body"
              role="status"
            >
              {{ statusMessage() }}
            </div>
          }

          <form
            [formGroup]="form"
            class="mt-9 space-y-5"
            novalidate
            (ngSubmit)="onSubmit()"
          >
            <div class="grid gap-5 md:grid-cols-2">
              <ij-input label="Nombre" placeholder="Tu nombre completo" [required]="true"
                [error]="fieldInvalid('name') ? 'Ingresa un nombre válido.' : null" formControlName="name" />
              <ij-input label="Correo" type="email" placeholder="tu@correo.com" [required]="true"
                [error]="fieldInvalid('email') ? 'Ingresa un correo válido.' : null" formControlName="email" />
              <ij-input label="Teléfono" type="tel" placeholder="+52 55 0000 0000" [required]="true"
                [error]="fieldInvalid('phone') ? 'Comparte un teléfono de contacto.' : null" formControlName="phone" />
              <ij-input label="Asunto" placeholder="¿En qué te ayudamos?" [required]="true"
                [error]="fieldInvalid('subject') ? 'Escribe un asunto breve.' : null" formControlName="subject" />
            </div>

            <ij-textarea label="Mensaje" [rows]="5" placeholder="Cuéntanos más detalles sobre tu necesidad." [required]="true"
              [error]="fieldInvalid('message') ? 'El mensaje debe tener al menos 20 caracteres.' : null" formControlName="message" />

            <button
              ij-button
              type="submit"
              shape="rounded"
              size="lg"
              class="shadow-float"
            >
              Enviar mensaje
            </button>
            <!--
              No hay endpoint de contacto (el módulo de notificaciones y el SMTP
              están pendientes: MAILER_PORT sigue en ConsoleMailerAdapter). En
              vez de fingir un acuse de recibo, el envío abre el gestor de
              correo con todo redactado, que sí llega a su destino.
            -->
            <p class="text-[13px] leading-relaxed text-muted">
              También puedes escribirnos directo a
              <a
                [href]="'mailto:' + generalEmail"
                class="font-medium text-brand-strong hover:underline"
                >{{ generalEmail }}</a
              >.
            </p>
          </form>
        </div>

        <div class="relative pt-4">
          <div
            class="absolute inset-y-0 -right-6 left-8 hidden rounded-[28px] bg-brand-50 lg:block"
          ></div>
          <div
            class="relative flex flex-col gap-6 rounded-[28px] bg-white p-6 shadow-float sm:p-8"
          >
            @for (item of infoCards(); track item.title) {
              <div class="flex gap-4 rounded-2xl border border-line/80 p-4 sm:gap-5 sm:p-5">
                <div
                  class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-strong"
                >
                  <ij-icon [name]="item.icon" [size]="24" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-ink-900">{{ item.title }}</h3>
                  @for (line of item.lines; track line; let i = $index) {
                    @if (item.hrefs[i]; as href) {
                      <p class="mt-1 text-sm leading-6">
                        <a
                          [href]="href"
                          class="text-muted transition-colors hover:text-brand-strong hover:underline"
                          >{{ line }}</a
                        >
                      </p>
                    } @else {
                      <p class="mt-1 text-sm leading-6 text-muted">{{ line }}</p>
                    }
                  }
                </div>
              </div>
            }

            <div class="rounded-2xl bg-surface p-5">
              <p class="text-sm font-semibold text-ink-900">Horario de atención</p>
              <p class="mt-2 text-sm leading-6 text-muted">
                Lunes a viernes de 8:00 a. m. a 6:00 p. m.
              </p>
              <p class="text-sm leading-6 text-muted">
                Soporte prioritario para empresas con vacantes activas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ContactFormSection {
  readonly infoCards = input.required<readonly ContactInfoCard[]>();
  readonly statusMessage = input<string | null>(null);
  readonly formSubmitted = output<ContactFormValue>();

  protected readonly generalEmail = BRAND_EMAILS.general;

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    phone: this.fb.control('', [Validators.required, Validators.minLength(7)]),
    subject: this.fb.control('', [Validators.required, Validators.minLength(4)]),
    message: this.fb.control('', [Validators.required, Validators.minLength(20)]),
  });

  protected readonly controls = this.form.controls;

  protected fieldInvalid(name: keyof typeof this.controls): boolean {
    const control = this.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formSubmitted.emit(this.form.getRawValue());
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    });
  }
}
