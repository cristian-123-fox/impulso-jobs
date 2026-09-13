import { excerpt, toPlainText } from '@/shared/utils/rich-text';

describe('toPlainText', () => {
  it('separa los bloques con saltos de línea', () => {
    expect(toPlainText('<p>Uno</p><p>Dos</p>')).toBe('Uno\nDos');
  });

  it('convierte una lista en líneas', () => {
    expect(toPlainText('<ul><li>Uno</li><li>Dos</li></ul>')).toBe('Uno\nDos');
  });

  it('neutraliza un cierre de script, que el JSON-LD no perdona', () => {
    const plain = toPlainText('Texto</script><script>alert(1)</script>');
    expect(plain).not.toContain('</script>');
    expect(plain).not.toContain('alert');
  });

  it('decodifica las entidades del editor', () => {
    expect(toPlainText('<p>Ventas&nbsp;&amp; marketing</p>')).toBe(
      'Ventas & marketing',
    );
  });

  it('deja intacto un texto plano antiguo', () => {
    expect(toPlainText('Uno\nDos')).toBe('Uno\nDos');
  });

  it('tolera null y undefined', () => {
    expect(toPlainText(null)).toBe('');
    expect(toPlainText(undefined)).toBe('');
  });
});

describe('excerpt', () => {
  it('deja el texto corto en una sola línea', () => {
    expect(excerpt('<p>Uno</p><p>Dos</p>')).toBe('Uno Dos');
  });

  it('corta por palabra, no a media palabra', () => {
    const long = 'palabra '.repeat(40);
    const result = excerpt(long, 50);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('palab…');
  });

  it('no añade puntos suspensivos si cabe entero', () => {
    expect(excerpt('Corto', 50)).toBe('Corto');
  });
});
