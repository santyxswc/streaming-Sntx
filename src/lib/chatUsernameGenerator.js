/**
 * Genera nombres tipo gamertag (español + cine) + dígitos aleatorios.
 */

const ADJETIVOS = [
  'Oscuro',
  'Plateado',
  'Epico',
  'Mudo',
  'Noble',
  'Rapido',
  'Fiel',
  'Dorado',
  'Rojo',
  'Gris',
  'Nuevo',
  'Viejo',
  'Alto',
  'Raso',
  'Cruel',
  'Bueno',
  'Malo',
  'Raro',
  'Fino',
  'Bruto',
  'Leve',
  'Falso',
  'Ciego',
  'Sordo',
  'Neto',
  'Puro',
  'Crudo',
  'Tonto',
  'Listo',
];

const SUSTANTIVOS = [
  'Butaca',
  'Pantalla',
  'Rollo',
  'Estreno',
  'Foco',
  'Luz',
  'Sala',
  'Toma',
  'Plano',
  'Premio',
  'Corte',
  'Cine',
  'Hilo',
  'Cupo',
  'Pase',
  'Risa',
  'Giro',
  'Voz',
  'Ojo',
  'Pie',
  'Asta',
  'Rima',
  'Mesa',
  'Codo',
  'Pico',
  'Ruta',
  'Caja',
  'Banda',
  'Sonido',
  'Guion',
  'Actor',
  'Copia',
  'Rueda',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(len) {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += Math.floor(Math.random() * 10).toString();
  }
  return s;
}

/**
 * @returns {string} ej. ButacaPlateado4821
 */
export function generateRandomChatName() {
  const a = pick(ADJETIVOS);
  const b = pick(SUSTANTIVOS);
  const n = randomDigits(4);
  return `${a}${b}${n}`;
}

/** Normaliza para comparar unicidad */
export function normalizeChatNameKey(name) {
  return name.trim().toLowerCase();
}

const MAX_LEN = 24;
const MIN_LEN = 3;

/** Nombres reservados (minúsculas) — suplantación, sistema, marcas sensibles */
const RESERVED_EXACT = new Set([
  'admin',
  'administrador',
  'administrator',
  'moderador',
  'moderator',
  'mod',
  'sistema',
  'system',
  'root',
  'staff',
  'soporte',
  'support',
  'helpdesk',
  'luvana',
  'oficial',
  'official',
  'null',
  'undefined',
  'anonimo',
  'anónimo',
  'anon',
  'bot',
  'servidor',
  'server',
]);

const RESERVED_PREFIX = ['admin', 'mod-', 'sys-', 'luvana', 'support'];

/**
 * @param {string} key - resultado de normalizeChatNameKey
 */
export function isReservedChatName(key) {
  const k = key.trim().toLowerCase();
  if (!k) return true;
  if (RESERVED_EXACT.has(k)) return true;
  for (const p of RESERVED_PREFIX) {
    if (k.startsWith(p)) return true;
  }
  return false;
}

/**
 * Valida nombre elegido por el usuario.
 * @returns {{ ok: true, name: string } | { ok: false, error: string }}
 */
export function validateCustomChatName(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Nombre inválido' };
  }
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_LEN) {
    return { ok: false, error: `Mínimo ${MIN_LEN} caracteres` };
  }
  if (name.length > MAX_LEN) {
    return { ok: false, error: `Máximo ${MAX_LEN} caracteres` };
  }
  if (!/^[\p{L}\p{N}\s\-_.]+$/u.test(name)) {
    return {
      ok: false,
      error: 'Solo letras, números, espacios, guiones y puntos',
    };
  }
  const key = normalizeChatNameKey(name);
  if (isReservedChatName(key)) {
    return { ok: false, error: 'Ese nombre no está permitido' };
  }
  return { ok: true, name };
}
