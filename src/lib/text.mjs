// Utilidades de texto puras (sin dependencias) compartidas por el servidor y los scripts.

/**
 * Quita las etiquetas HTML de un texto. Repite la pasada hasta que no cambia: una sola
 * pasada deja etiquetas intactas si el texto anida (`<<b>script>` → `<script>`), y elimina
 * cualquier `<` o `>` suelto al final. El resultado se pinta como texto (React lo escapa);
 * esto NO sanea HTML para insertarlo con innerHTML.
 */
export function stripHtml(html) {
  if (!html) return '';
  let text = String(html);
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);
  return text.replace(/[<>]/g, '').trim();
}

/**
 * Prepara un valor que viene del usuario para escribirlo en un log: sin saltos de línea ni
 * caracteres de control (que permitirían falsificar líneas de log) y con longitud acotada.
 */
export function sanitizeForLog(value, maxLength = 200) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/** ¿La URL apunta a tvmaze.com o a uno de sus subdominios? Ancla el dominio, no busca texto suelto. */
export function isTvmazeUrl(url) {
  return typeof url === 'string' && /^https?:\/\/(?:[^/?#@]*\.)?tvmaze\.com(?::\d+)?(?:[/?#]|$)/i.test(url);
}
