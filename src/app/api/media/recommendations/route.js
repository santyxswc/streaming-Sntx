import { NextResponse } from 'next/server';
import { getRecommendations } from '@/services/recommendations';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const revalidate = 3600;

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET(request) {
  const limitResponse = rateLimit(request, {
    limit: 30,
    windowMs: 60000,
    id: 'media-recommendations',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const type = searchParams.get('type');

  if (!itemId || !type) {
    return NextResponse.json({ success: false, error: 'itemId and type are required' }, { status: 400 });
  }

  try {
    const item = { id: itemId, type: type === 'series' ? 'series' : 'movie' };
    const data = await getRecommendations(item, 60);
    return NextResponse.json({ success: true, data }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Recommendations API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
