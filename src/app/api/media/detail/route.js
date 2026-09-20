import { NextResponse } from 'next/server';
import { getMediaBySlug } from '@/services/db';
import { getTmdbMedia } from '@/lib/tmdb';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const revalidate = 3600;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(request) {
  // Apply Rate Limit: 20 req/min
  const limitResponse = rateLimit(request, {
    limit: 20,
    windowMs: 60000,
    id: 'media-detail',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const slug = searchParams.get('slug');

  if (!type || !slug) {
    return NextResponse.json({ success: false, error: 'Type and Slug are required' }, { status: 400 });
  }

  try {
    // Los resultados provenientes de TMDB (via /api/media/multi-search) usan
    // slugs con prefijo `tmdb-<id>` y no existen en el catálogo local.
    if (slug.startsWith('tmdb-')) {
      const tmdbId = slug.slice('tmdb-'.length);
      const data = await getTmdbMedia(type, tmdbId);
      if (!data) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
    }

    const data = await getMediaBySlug(type, slug);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Detail API Error:', error);
    const msg = error?.message || '';
    const status =
      msg.includes('MISSING_ENV') || msg.includes('INVALID_JSON') || msg.includes('FIREBASE')
        ? 503
        : 500;
    return NextResponse.json(
      { success: false, error: status === 503 ? 'Configuración de catálogo incorrecta' : error.message },
      { status }
    );
  }
}
