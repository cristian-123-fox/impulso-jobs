import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { InlineTranslocoLoader } from '@/core/i18n/transloco.loader';
import { AboutTeam } from '@/features/public/about/components/about-team/about-team';
import { AboutTeamMember } from '@/features/public/about/models/about.models';

function member(overrides: Partial<AboutTeamMember> = {}): AboutTeamMember {
  return {
    id: 'direccion',
    name: 'Ana Martínez',
    roleKey: 'about.team.members.direccion.role',
    bioKey: 'about.team.members.direccion.bio',
    order: 1,
    tone: 'brand',
    icon: 'user',
    ...overrides,
  };
}

describe('AboutTeam', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutTeam],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['es', 'en'], defaultLang: 'es' },
          loader: InlineTranslocoLoader,
        }),
      ],
    }).compileComponents();

    // El `*transloco` no pinta la sección hasta que el diccionario está
    // cargado. El loader real usa `import()` asíncrono: se precarga aquí.
    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('es');
    await firstValueFrom(transloco.load('es'));
  });

  /**
   * El loader de Transloco es asíncrono (`import()`), así que la sección no
   * existe hasta que resuelve. `whenStable` + un segundo `detectChanges` deja
   * el DOM como lo vería el navegador.
   */
  async function render(
    members: readonly AboutTeamMember[],
  ): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(AboutTeam);
    fixture.componentRef.setInput('members', members);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta una tarjeta por miembro y usa iniciales cuando no hay foto', async () => {
    const el = await render([member()]);

    expect(el.querySelectorAll('li').length).toBe(1);
    expect(el.textContent).toContain('AM');
    expect(el.querySelector('img')).toBeNull();
  });

  it('si el equipo está vacío no pinta la sección', async () => {
    const el = await render([]);

    expect(el.querySelector('section')).toBeNull();
  });

  it('pinta la foto y el enlace de LinkedIn cuando existen', async () => {
    const el = await render([
      member({
        photo: '/assets/images/team/ana.webp',
        linkedin: 'https://www.linkedin.com/in/ana',
      }),
    ]);

    const img = el.querySelector('img');
    const link = el.querySelector('a[href="https://www.linkedin.com/in/ana"]');

    expect(img?.getAttribute('src')).toBe('/assets/images/team/ana.webp');
    expect(img?.getAttribute('alt')).toBe('Ana Martínez');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
