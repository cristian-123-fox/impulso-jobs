/**
 * Detección ligera de datos de contacto en textos de vacantes (T11).
 * Decisión de producto: se AVISA en línea al reclutador, no se bloquea la
 * publicación. Cubre las ofuscaciones típicas ("arroba", "punto com").
 */

interface PiiPattern {
  readonly label: string;
  readonly regex: RegExp;
}

const PATTERNS: readonly PiiPattern[] = [
  { label: 'un correo', regex: /[\w.+-]+@[\w-]+\.[a-z]{2,}/i },
  { label: 'un correo', regex: /\barroba\b/i },
  { label: 'un enlace', regex: /(https?:\/\/|www\.)\S+/i },
  { label: 'un enlace', regex: /\b[\w-]+\.(com|com\.mx|mx|net|org|io|me)\b/i },
  { label: 'un enlace', regex: /\bpunto\s?com\b/i },
  // 10+ dígitos seguidos aunque lleven espacios, guiones o paréntesis.
  { label: 'un teléfono', regex: /(?:\d[\s().-]?){10,}/ },
  { label: 'un teléfono', regex: /\bwhats\s?app\b/i },
];

/** Devuelve las categorías detectadas (sin duplicados), vacío si está limpio. */
export function detectPii(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(text)) found.add(pattern.label);
  }
  return [...found];
}

/** Mensaje de advertencia listo para mostrar, o null si no hay hallazgos. */
export function piiWarning(text: string | null | undefined): string | null {
  const found = detectPii(text);
  if (found.length === 0) return null;
  return (
    `Parece que incluiste ${found.join(', ')}. ` +
    'Los candidatos te contactan por la plataforma: evita datos de contacto ' +
    'directos en la publicación.'
  );
}
