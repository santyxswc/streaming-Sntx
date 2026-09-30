import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/http/rateLimit';
import { logger, withLogContext, requestIdFrom } from '@/server/observability/logger';

/** Políticas de caché CDN reutilizables (Cache-Control). */
export const CachePolicy = {
  none: 'no-store',
  short: 'public, s-maxage=1800, stale-while-revalidate=86400',
  hour: 'public, s-maxage=3600, stale-while-revalidate=86400',
  day: 'public, s-maxage=86400, stale-while-revalidate=604800',
};

/** Error con código HTTP cuyo mensaje sí es seguro mostrar al cliente. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'No encontrado') => new HttpError(404, message);

// Errores de configuración que lanzan los proveedores (env ausente o mal formada).
const CONFIG_ERROR = /MISSING_ENV|INVALID_JSON|FIREBASE|DATABASE_URL/;

export function errorResponse(error, context = 'api') {
  if (error instanceof HttpError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  logger.error('api.error', { route: context, err: error });
  const isConfig = CONFIG_ERROR.test(error?.message || '');
  return NextResponse.json(
    { success: false, error: isConfig ? 'Servicio no configurado' : 'Error interno del servidor' },
    { status: isConfig ? 503 : 500 }
  );
}

/**
 * Envuelve un Route Handler de lectura: aplica rate limit, serializa
 * `{ success, data }` con la política de caché indicada y traduce errores.
 * El handler solo contiene lógica de la ruta: devuelve datos o lanza HttpError.
 *
 * @param {(request: Request, ctx: { params: Promise<Record<string, string>>, searchParams: URLSearchParams }) => Promise<unknown>} handler
 * @param {{ id: string, limit?: number, windowMs?: number, cache?: string }} options
 */
export function withApiHandler(handler, { id, limit = 30, windowMs = 60000, cache = CachePolicy.hour }) {
  return (request, ctx = {}) =>
    // Todo log emitido durante la petición lleva la ruta y un requestId (el de Vercel si existe).
    withLogContext({ route: id, requestId: requestIdFrom(request) }, async () => {
      const limited = await rateLimit(request, { id, limit, windowMs });
      if (limited) return limited;

      try {
        const { searchParams } = new URL(request.url);
        const data = await handler(request, { ...ctx, searchParams });
        return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': cache } });
      } catch (error) {
        return errorResponse(error, id);
      }
    });
}
