import { NextRequest, NextResponse } from 'next/server';
import { retryPendingEvents } from '@/lib/outbox';

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-movieflex-outbox-token');
  if (!token || token !== process.env.MOVIEFLEX_OUTBOX_TOKEN) return NextResponse.json({ success: false }, { status: 403 });
  return NextResponse.json({ success: true, data: await retryPendingEvents() });
}
