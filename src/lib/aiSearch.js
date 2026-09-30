// Validación del buscador con IA. Módulo puro (sin 'server-only') para poder
// testearlo y para que el input del cliente comparta el mismo límite.

export const MAX_QUERY_LENGTH = 300;
const MAX_FIELD_LENGTH = 200;

/**
 * Valida la consulta del usuario antes de enviarla al modelo (cada carácter cuesta).
 * @returns {string} consulta recortada
 * @throws {Error & { status: number }} con mensaje seguro para el cliente
 */
export function parseSearchQuery(raw) {
  if (typeof raw !== 'string') {
    throw Object.assign(new Error('Query is required'), { status: 400 });
  }
  const query = raw.trim();
  if (!query) {
    throw Object.assign(new Error('Query is required'), { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw Object.assign(
      new Error(`La consulta no puede superar los ${MAX_QUERY_LENGTH} caracteres`),
      { status: 400 }
    );
  }
  return query;
}

const asText = (value) =>
  typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';

/**
 * Interpreta la respuesta del modelo. Es entrada no confiable: puede no ser JSON,
 * traer tipos inesperados o texto inyectado por el usuario. Se normaliza a cadenas
 * acotadas y `type` solo puede ser 'movie' o 'series'.
 * @returns {{titleSpanish: string, titleOriginal: string, type: 'movie'|'series', year: string, explanation: string} | null}
 *   null si la respuesta no es utilizable.
 */
export function parseAiPrediction(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const titleSpanish = asText(parsed.titleSpanish);
  const titleOriginal = asText(parsed.titleOriginal);
  if (!titleSpanish && !titleOriginal) return null;

  return {
    titleSpanish,
    titleOriginal,
    type: parsed.type === 'movie' ? 'movie' : 'series',
    year: asText(String(parsed.year ?? '')).slice(0, 4),
    explanation: asText(parsed.explanation),
  };
}
