import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getTrailersForMedia } from '@/services/trailers/trailerService';

export const runtime = 'nodejs';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

/**
 * GET /api/media/trailer?type=movie|series&id=<id del catálogo>
 * → { success, data: { trailers: [{ key, name, language, official, type }] } }
 */
export async function GET(request) {
  const limitResponse = rateLimit(request, {
    limit: 40,
    windowMs: 60000,
    id: 'media-trailer',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id')?.trim();

  if (!id || (type !== 'movie' && type !== 'series')) {
    return NextResponse.json(
      { success: false, error: "Parámetros requeridos: id y type ('movie' | 'series')" },
      { status: 400 }
    );
  }

  try {
    const data = await getTrailersForMedia(type, id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Título no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('[trailer] Error resolviendo tráilers:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron obtener los tráilers' }, { status: 500 });
  }
}
