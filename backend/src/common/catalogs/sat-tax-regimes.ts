/**
 * Catálogo SAT de régimen fiscal (c_RegimenFiscal). Requerido para CFDI 4.0.
 * Se valida por código; incluye regímenes de personas morales y físicas.
 */
export interface SatTaxRegime {
  code: string;
  name: string;
}

export const SAT_TAX_REGIMES: readonly SatTaxRegime[] = [
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', name: 'Arrendamiento' },
  { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', name: 'Demás ingresos' },
  {
    code: '610',
    name: 'Residentes en el Extranjero sin Establecimiento Permanente',
  },
  { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
  {
    code: '612',
    name: 'Personas Físicas con Actividades Empresariales y Profesionales',
  },
  { code: '614', name: 'Ingresos por intereses' },
  { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', name: 'Sin obligaciones fiscales' },
  { code: '620', name: 'Sociedades Cooperativas de Producción' },
  { code: '621', name: 'Incorporación Fiscal' },
  {
    code: '622',
    name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  },
  { code: '623', name: 'Opcional para Grupos de Sociedades' },
  { code: '624', name: 'Coordinados' },
  {
    code: '625',
    name: 'Actividades Empresariales con ingresos por Plataformas Tecnológicas',
  },
  { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
  { code: '628', name: 'Hidrocarburos' },
  {
    code: '629',
    name: 'Regímenes Fiscales Preferentes y Empresas Multinacionales',
  },
  { code: '630', name: 'Enajenación de acciones en bolsa de valores' },
];

export const SAT_TAX_REGIME_CODES: readonly string[] = SAT_TAX_REGIMES.map(
  (r) => r.code,
);

export function isValidSatTaxRegime(code: string): boolean {
  return SAT_TAX_REGIME_CODES.includes(code);
}
