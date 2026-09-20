import { NextResponse } from 'next/server';
import { getMediaSorted } from '@/services/db';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const revalidate = 3600;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(request) {
  // Apply Rate Limit: 30 requests per minute for browsing
  const limitResponse = rateLimit(request, {
    limit: 30,
    windowMs: 60000,
    id: 'media-list',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const count = parseInt(searchParams.get('count') || '20');
  const sortField = searchParams.get('sortField') || 'scrapedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const lastId = searchParams.get('lastId');
  const genre = searchParams.get('genre');
  const year = searchParams.get('year');
  const country = searchParams.get('country');

  try {
    const data = await getMediaSorted(type, sortField, sortOrder, count, lastId, genre, year, country);
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error(`API Media Error [${type}]:`, error);
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
