import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  PaymentMethod,
  PaymentProvider,
  PaymentProviderOption,
  Plan,
} from '@/features/company/billing/models/billing.models';
import { SubscriptionForm } from '@/features/company/billing/components/subscription-form/subscription-form';

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'basico',
    code: 'BASICO',
    name: 'Básico',
    description: 'Plan de prueba',
    planType: 'PER_PUBLICATION',
    billingPeriod: 'ONE_TIME',
    validityDays: 30,
    postingQuota: 1,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    price: {
      subtotal: 1200,
      taxRate: 0.16,
      taxAmount: 192,
      total: 1392,
      currency: 'MXN',
    },
    paymentMethods: [],
    features: [],
    ...overrides,
  };
}

const paymentOptions: PaymentProviderOption[] = [
  {
    provider: PaymentProvider.MANUAL,
    methods: [PaymentMethod.SPEI],
    recurringMethods: [PaymentMethod.SPEI],
  },
];

describe('SubscriptionForm · planes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('pinta nombre y precio de cada plan', () => {
    const fixture = TestBed.createComponent(SubscriptionForm);
    fixture.componentRef.setInput('plans', [
      plan(),
      plan({
        id: 'premium',
        code: 'PREMIUM',
        name: 'Premium',
        isPopular: true,
        price: {
          subtotal: 2500,
          taxRate: 0.16,
          taxAmount: 400,
          total: 2900,
          currency: 'MXN',
        },
      }),
    ]);
    fixture.componentRef.setInput('paymentOptions', paymentOptions);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Básico');
    expect(text).toContain('Premium');
    expect(text).toContain('1,392');
    expect(text).toContain('2,900');
  });
});
