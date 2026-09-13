import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IjRichText } from '@/shared/ui/rich-text/rich-text';

describe('IjRichText', () => {
  let fixture: ComponentFixture<IjRichText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IjRichText] }).compileComponents();
    fixture = TestBed.createComponent(IjRichText);
  });

  function render(value: string, variant: 'prose' | 'check' = 'prose'): HTMLElement {
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta el HTML del editor como marcado, no como texto', () => {
    const el = render('<p>Buscamos <strong>Angular</strong>.</p>');
    expect(el.querySelector('strong')?.textContent).toBe('Angular');
    expect(el.textContent).not.toContain('<strong>');
  });

  it('conserva las listas del editor', () => {
    const el = render('<ul><li>Uno</li><li>Dos</li></ul>', 'check');
    expect(el.querySelectorAll('li').length).toBe(2);
  });

  it('una vacante antigua en texto plano mantiene sus saltos de línea', () => {
    const el = render('Primera línea\nSegunda línea');
    const paragraph = el.querySelector('p');
    expect(paragraph?.classList).toContain('whitespace-pre-line');
    expect(paragraph?.textContent).toContain('Primera línea');
    expect(paragraph?.textContent).toContain('Segunda línea');
  });

  it('un texto plano con variante check se parte en viñetas por línea', () => {
    const el = render('Requisito uno\nRequisito dos\n\nRequisito tres', 'check');
    const items = el.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[2].textContent?.trim()).toBe('Requisito tres');
  });

  it('no confunde "<3 años" con marcado', () => {
    const el = render('Experiencia <3 años');
    expect(el.querySelector('p')?.classList).toContain('whitespace-pre-line');
  });

  it('Angular sanea el HTML que llegue con script', () => {
    // Segunda capa: el backend ya lo limpia, pero `[innerHTML]` no debe dejar
    // pasar un script aunque el dato venga sucio de algún sitio.
    const el = render('<p>Hola</p><script>alert(1)</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.textContent).toContain('Hola');
  });
});
