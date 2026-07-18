/**
 * Catálogo SAT de uso de CFDI (c_UsoCFDI). Requerido para CFDI 4.0 y la
 * facturación (M18). Se valida por código; se incluyen los usos relevantes para
 * personas morales/empresas.
 */
export interface SatCfdiUse {
  code: string;
  name: string;
}

export const SAT_CFDI_USES: readonly SatCfdiUse[] = [
  { code: 'G01', name: 'Adquisición de mercancías' },
  { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', name: 'Gastos en general' },
  { code: 'I01', name: 'Construcciones' },
  { code: 'I02', name: 'Mobiliario y equipo de oficina por inversiones' },
  { code: 'I03', name: 'Equipo de transporte' },
  { code: 'I04', name: 'Equipo de cómputo y accesorios' },
  { code: 'I05', name: 'Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', name: 'Comunicaciones telefónicas' },
  { code: 'I07', name: 'Comunicaciones satelitales' },
  { code: 'I08', name: 'Otra maquinaria y equipo' },
  { code: 'S01', name: 'Sin efectos fiscales' },
  { code: 'CP01', name: 'Pagos' },
];

export const SAT_CFDI_USE_CODES: readonly string[] = SAT_CFDI_USES.map(
  (u) => u.code,
);

export function isValidSatCfdiUse(code: string): boolean {
  return SAT_CFDI_USE_CODES.includes(code);
}
