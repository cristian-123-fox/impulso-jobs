/** Catálogos mínimos de México para el registro (reflejan el backend M5). */

export interface CatalogItem {
  code: string;
  name: string;
}

/** 32 estados (ISO 3166-2:MX). */
export const MX_STATES: readonly CatalogItem[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'CMX', name: 'Ciudad de México' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Estado de México' },
  { code: 'MIC', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Querétaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
];

/** Régimen fiscal SAT (c_RegimenFiscal). */
export const SAT_TAX_REGIMES: readonly CatalogItem[] = [
  { code: '601', name: '601 · General de Ley Personas Morales' },
  { code: '603', name: '603 · Personas Morales con Fines no Lucrativos' },
  { code: '605', name: '605 · Sueldos y Salarios' },
  { code: '606', name: '606 · Arrendamiento' },
  { code: '607', name: '607 · Enajenación o Adquisición de Bienes' },
  { code: '608', name: '608 · Demás ingresos' },
  { code: '610', name: '610 · Residentes en el Extranjero' },
  { code: '611', name: '611 · Ingresos por Dividendos' },
  { code: '612', name: '612 · Actividades Empresariales y Profesionales' },
  { code: '614', name: '614 · Ingresos por intereses' },
  { code: '615', name: '615 · Ingresos por obtención de premios' },
  { code: '616', name: '616 · Sin obligaciones fiscales' },
  { code: '620', name: '620 · Sociedades Cooperativas de Producción' },
  { code: '621', name: '621 · Incorporación Fiscal' },
  { code: '622', name: '622 · Actividades Agrícolas, Ganaderas y Pesqueras' },
  { code: '623', name: '623 · Opcional para Grupos de Sociedades' },
  { code: '624', name: '624 · Coordinados' },
  { code: '625', name: '625 · Ingresos por Plataformas Tecnológicas' },
  { code: '626', name: '626 · Régimen Simplificado de Confianza (RESICO)' },
  { code: '628', name: '628 · Hidrocarburos' },
  { code: '629', name: '629 · Regímenes Fiscales Preferentes' },
  { code: '630', name: '630 · Enajenación de acciones en bolsa' },
];

/** Tipo de documento de identidad. */
export const DOCUMENT_TYPES: readonly { value: string; label: string }[] = [
  { value: 'CURP', label: 'CURP' },
  { value: 'RFC', label: 'RFC' },
  { value: 'INE', label: 'INE' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];
