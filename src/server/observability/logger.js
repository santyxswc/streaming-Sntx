import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { sanitizeForLog } from '@/lib/text.mjs';

/**
 * Logger estructurado: cada evento es UNA línea JSON `{ ts, level, event, ...contexto, ...campos }`,
 * que Vercel indexa y se puede filtrar por nivel, ruta o requestId.
 *
 * Reglas:
 * - Los eventos tienen nombre fijo (`feed.section_failed`); los datos variables van en campos.
 * - Todo texto pasa por `sanitizeForLog` (sin saltos de línea ni caracteres de control) y por
 *   una redacción de secretos, tokens, cadenas de conexión y correos.
 * - No se registran datos personales (correos, UID, contenido de mensajes): el logger redacta
 *   por clave y por patrón, pero la primera defensa es no pasarlos.
 * - `ts`, `level` y `event` no se pueden sobrescribir desde los campos.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|bearer|session|e-?mail|dsn|connection/i;

const TEXT_REDACTIONS = [
  [/(api[_-]?key|access[_-]?token|token|secret|password|key)=([^&\s"']+)/gi, '$1=[redacted]'],
  [/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]'],
  [/postgres(?:ql)?:\/\/[^\s"']+/gi, 'postgres://[redacted]'],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
];

const MAX_TEXT = 500;
const MAX_DEPTH = 3;
const MAX_KEYS = 30;
const MAX_ITEMS = 20;
const STACK_LINES = 4;

export function redactText(value, maxLength = MAX_TEXT) {
  let text = sanitizeForLog(value, maxLength);
  for (const [pattern, replacement] of TEXT_REDACTIONS) text = text.replace(pattern, replacement);
  return text;
}

function serializeError(error) {
  const out = { name: redactText(error.name, 80), message: redactText(error.message) };
  if (error.code !== undefined) out.code = redactText(error.code, 80);
  // Respuestas HTTP de librerías (p. ej. Axios): solo el estado, nunca el cuerpo ni las cabeceras.
  const status = error.status ?? error.response?.status;
  if (typeof status === 'number') out.status = status;
  if (typeof error.stack === 'string') {
    out.stack = error.stack
      .split('\n')
      .slice(1, 1 + STACK_LINES)
      .map((line) => redactText(line.trim(), 200));
  }
  return out;
}

function serialize(value, depth = 0) {
  if (value === null || value === undefined) return null;
  switch (typeof value) {
    case 'string':
      return redactText(value);
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'boolean':
      return value;
    case 'bigint':
      return String(value);
    case 'function':
    case 'symbol':
      return `[${typeof value}]`;
    default:
  }
  if (value instanceof Error) return serializeError(value);
  if (depth >= MAX_DEPTH) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, MAX_ITEMS).map((item) => serialize(item, depth + 1));
  const out = {};
  for (const key of Object.keys(value).slice(0, MAX_KEYS)) {
    if (value[key] === undefined) continue;
    out[redactText(key, 60)] = SENSITIVE_KEY.test(key) ? '[redacted]' : serialize(value[key], depth + 1);
  }
  return out;
}

const storage = new AsyncLocalStorage();

/** Ejecuta `fn` con un contexto (`route`, `requestId`…) que se añade a todos los logs de su ámbito. */
export function withLogContext(context, fn) {
  const parent = storage.getStore() ?? {};
  return storage.run({ ...parent, ...serialize(context) }, fn);
}

/** Identificador de petición: el de Vercel si existe (acotado y saneado), si no uno nuevo. */
export function requestIdFrom(request) {
  const header = request?.headers?.get?.('x-vercel-id');
  const clean = header ? sanitizeForLog(header, 64).replace(/[^\w.:-]/g, '') : '';
  return clean || globalThis.crypto.randomUUID();
}

const CONSOLE_METHOD = { debug: 'log', info: 'log', warn: 'warn', error: 'error' };

export function createLogger({ level, sink } = {}) {
  const threshold = () => LEVELS[level ?? process.env.LOG_LEVEL] ?? LEVELS.info;
  const write = sink ?? ((lvl, line) => console[CONSOLE_METHOD[lvl]](line));

  const log = (lvl, event, fields = {}) => {
    if (LEVELS[lvl] < threshold()) return;
    // `base` se declara primero (orden de claves legible) y se repite al final para que ningún
    // campo del contexto o del evento pueda sobrescribirlo.
    const base = { ts: new Date().toISOString(), level: lvl, event: redactText(event, 80) };
    const entry = { ...base, ...serialize(storage.getStore() ?? {}), ...serialize(fields), ...base };
    write(lvl, JSON.stringify(entry));
  };

  return {
    debug: (event, fields) => log('debug', event, fields),
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, fields) => log('error', event, fields),
  };
}

export const logger = createLogger();
