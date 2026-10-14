import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
} from './consent.config';

/**
 * La normalización de preferencias es la que impide que alguien encienda una
 * categoría con una cookie editada a mano, así que es donde vale la pena probar
 * de verdad.
 */
describe('normalizePreferences', () => {
  it('devuelve el registro restrictivo cuando no hay nada guardado', () => {
    expect(normalizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences('no soy un objeto')).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it('mantiene las categorías que vienen activadas', () => {
    const result = normalizePreferences({
      functional: true,
      marketing: true,
    });

    expect(result.functional).toBeTrue();
    expect(result.marketing).toBeTrue();
    expect(result.analytics).toBeFalse();
  });

  it('ignora una categoría desconocida en lugar de propagarla', () => {
    const result = normalizePreferences({ functional: true, hacks: true });

    expect(Object.keys(result).sort()).toEqual([
      'analytics',
      'functional',
      'marketing',
      'necessary',
    ]);
    expect(result['hacks' as keyof typeof result]).toBeUndefined();
  });

  it('no deja que una cookie manipulada apague `necessary`', () => {
    // `necessary` no es una elección: idioma y registro son lo mínimo para que
    // el sitio funcione. Una cookie editada a mano no puede desactivarla.
    const result = normalizePreferences({ necessary: false });

    expect(result.necessary).toBeTrue();
  });

  it('descarta valores que no son booleanos', () => {
    const result = normalizePreferences({ functional: 'sí', analytics: 1 });

    expect(result.functional).toBeFalse();
    expect(result.analytics).toBeFalse();
  });
});