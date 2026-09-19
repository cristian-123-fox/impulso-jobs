import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideTransloco } from '@jsverse/transloco';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { IjPhoneInput } from '@/shared/ui/phone-input/phone-input';
import {
  fromPhonePayload,
  toPhonePayload,
  type IjPhoneValue,
} from '@/shared/utils/phone';

@Component({
  imports: [IjPhoneInput, ReactiveFormsModule],
  template: `
    <ij-phone-input
      label="Teléfono"
      [formControl]="control"
      [lockCountry]="locked()"
    />
  `,
})
class HostComponent {
  readonly control = new FormControl<IjPhoneValue | null>(null);
  readonly locked = signal(false);
}

/**
 * Lo que importa del control (T36 · § 9.3): que el valor vaya y vuelva sin
 * pérdida y que cambiar de país recalcule el E.164. El caso que justifica que el
 * valor sea un objeto es Canadá: su E.164 es indistinguible del de Estados
 * Unidos.
 */
describe('IjPhoneInput', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[type="tel"]');
  }

  function countryTrigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  function type(value: string): void {
    const element = input();
    element.value = value;
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('arranca en México y sin número', () => {
    expect(countryTrigger().textContent).toContain('MX');
    expect(countryTrigger().textContent).toContain('+52');
    expect(input().value).toBe('');
  });

  it('calcula el E.164 al teclear y descarta los signos', () => {
    type('(33) 1234-5678');

    expect(host.control.value).toEqual({
      country: 'MX',
      national: '3312345678',
      e164: '+523312345678',
    });
  });

  it('deja el E.164 en null mientras el número está incompleto', () => {
    type('33123');

    expect(host.control.value?.e164).toBeNull();
    expect(host.control.value?.national).toBe('33123');
  });

  it('writeValue pinta el país guardado, también el que comparte el +1', () => {
    host.control.setValue(fromPhonePayload('+16045550123', 'CA'));
    fixture.detectChanges();

    expect(countryTrigger().textContent).toContain('CA');
    expect(input().value).toBe('6045550123');
  });

  it('cambiar de país recalcula el E.164 sin perder el número', () => {
    type('3101234567');
    expect(host.control.value?.e164).toBe('+523101234567');

    // Abrir el panel y elegir Colombia.
    countryTrigger().click();
    fixture.detectChanges();
    const options = Array.from(
      document.querySelectorAll('[role="option"]'),
    ) as HTMLElement[];
    const colombia = options.find((o) => o.textContent?.includes('+57'));
    colombia?.click();
    fixture.detectChanges();

    expect(host.control.value).toEqual({
      country: 'CO',
      national: '3101234567',
      e164: '+573101234567',
    });
  });

  it('con lockCountry el selector no abre', () => {
    host.locked.set(true);
    fixture.detectChanges();

    countryTrigger().click();
    fixture.detectChanges();

    expect(document.querySelectorAll('[role="option"]').length).toBe(0);
  });

  it('el valor va y vuelve de la API sin pérdida', () => {
    host.control.setValue(fromPhonePayload('+14155550123', 'US'));
    const payload = toPhonePayload(host.control.value);

    expect(payload).toEqual({ phone: '+14155550123', phoneCountry: 'US' });
    expect(fromPhonePayload(payload.phone, payload.phoneCountry)).toEqual({
      country: 'US',
      national: '4155550123',
      e164: '+14155550123',
    });
  });

  it('un teléfono vacío no manda país: sin teléfono, el país es ruido', () => {
    expect(toPhonePayload(null)).toEqual({ phone: null, phoneCountry: null });
    type('3312345678');
    type('');
    expect(toPhonePayload(host.control.value)).toEqual({
      phone: null,
      phoneCountry: null,
    });
  });
});
