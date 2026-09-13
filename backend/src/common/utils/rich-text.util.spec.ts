import {
  isBlank,
  richTextLength,
  sanitizeRichText,
  toPlainText,
} from '@/common/utils/rich-text.util';

describe('sanitizeRichText', () => {
  it('conserva el formato que el editor produce', () => {
    const html =
      '<p>Buscamos <strong>Angular</strong> y <em>TypeScript</em>.</p>' +
      '<ul><li>Tres años</li><li>Inglés</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('elimina el script pero conserva el texto que lo rodea', () => {
    const clean = sanitizeRichText(
      '<p>Hola</p><script>alert("xss")</script><p>Adiós</p>',
    );
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert');
    expect(clean).toContain('Hola');
    expect(clean).toContain('Adiós');
  });

  it('quita los manejadores de evento en línea', () => {
    const clean = sanitizeRichText('<p onclick="robar()">Texto</p>');
    expect(clean).toBe('<p>Texto</p>');
  });

  it('descarta un enlace con esquema javascript', () => {
    const clean = sanitizeRichText('<a href="javascript:alert(1)">Pincha</a>');
    expect(clean).not.toContain('javascript');
    expect(clean).toContain('Pincha');
  });

  it('descarta un enlace con esquema data', () => {
    const clean = sanitizeRichText(
      '<a href="data:text/html;base64,PHNjcmlwdD4=">Pincha</a>',
    );
    expect(clean).not.toContain('data:');
  });

  it('mantiene los enlaces normales y los abre de forma segura', () => {
    const clean = sanitizeRichText('<a href="https://impulsojobs.com">Web</a>');
    expect(clean).toContain('href="https://impulsojobs.com"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('target="_blank"');
  });

  it('descarta etiquetas que descuadrarían el portal', () => {
    const clean = sanitizeRichText(
      '<table><tr><td>Celda</td></tr></table><img src="x.png"><p>Texto</p>',
    );
    expect(clean).not.toContain('<table');
    expect(clean).not.toContain('<img');
    expect(clean).toContain('Celda');
    expect(clean).toContain('<p>Texto</p>');
  });

  it('descarta iframes y objetos incrustados', () => {
    const clean = sanitizeRichText('<iframe src="https://malo.com"></iframe>');
    expect(clean).not.toContain('iframe');
  });

  it('deja el texto plano de una vacante antigua tal cual', () => {
    expect(sanitizeRichText('Texto sin etiquetas')).toBe('Texto sin etiquetas');
  });

  it('devuelve cadena vacía cuando sólo queda marcado sin contenido', () => {
    expect(sanitizeRichText('<p>&nbsp;</p>')).toBe('');
    expect(sanitizeRichText('<p><br></p>')).toBe('');
  });
});

describe('toPlainText', () => {
  it('separa los bloques con saltos de línea', () => {
    expect(toPlainText('<p>Uno</p><p>Dos</p>')).toBe('Uno\nDos');
  });

  it('convierte una lista en líneas', () => {
    expect(toPlainText('<ul><li>Uno</li><li>Dos</li></ul>')).toBe('Uno\nDos');
  });

  it('neutraliza un cierre de script, que el JSON-LD no perdona', () => {
    const plain = toPlainText('Descripción</script><script>alert(1)</script>');
    expect(plain).not.toContain('</script>');
    expect(plain).not.toContain('alert');
  });

  it('decodifica las entidades que deja el editor', () => {
    expect(toPlainText('<p>Ventas&nbsp;&amp; marketing</p>')).toBe(
      'Ventas & marketing',
    );
  });

  it('respeta un texto plano antiguo con saltos de línea', () => {
    expect(toPlainText('Uno\nDos')).toBe('Uno\nDos');
  });
});

describe('isBlank / richTextLength', () => {
  it('considera vacío lo que el editor deja al borrarlo todo', () => {
    expect(isBlank('<p>&nbsp;</p>')).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank('<p>Algo</p>')).toBe(false);
  });

  it('mide el contenido, no el marcado', () => {
    // "Hola" son 4 caracteres aunque el HTML ocupe muchos más.
    expect(richTextLength('<p><strong>Hola</strong></p>')).toBe(4);
  });
});
