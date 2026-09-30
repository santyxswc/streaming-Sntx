import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/http/rateLimit';

export async function POST(req) {
  try {
    // Apply Rate Limit: 5 attempts per 5 minutes for auth (login/register)
    const limitResponse = await rateLimit(req, {
      limit: 5,
      windowMs: 5 * 60 * 1000,
      id: 'auth-submit',
    });
    if (limitResponse) return limitResponse;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth limit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
