import { NextResponse } from 'next/server';
import { getFilterMetadata } from '@/services/db';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(request) {
  const limitResponse = rateLimit(request, {
    limit: 60,
    windowMs: 60000,
    id: 'media-metadata',
  });
  if (limitResponse) return limitResponse;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';

  try {
    const data = await getFilterMetadata(type);
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error) {
    console.error('API Metadata Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
