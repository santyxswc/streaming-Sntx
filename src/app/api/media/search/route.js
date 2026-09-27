import { NextResponse } from 'next/server';
import { searchCatalog } from '@/server/catalog/catalogRepository';
import { rateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const revalidate = 1800;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
};

export async function GET(request) {
  // Apply Rate Limit: 10 requests per minute for search (expensive)
  const limitResponse = rateLimit(request, {
    limit: 10,
    windowMs: 60000,
    id: 'media-search',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const qStr = searchParams.get('q');
  
  if (!qStr) return NextResponse.json({ success: true, data: [] }, { headers: CACHE_HEADERS });

  try {
    const results = await searchCatalog(qStr);
    return NextResponse.json({ success: true, data: results }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
