import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { retryPendingEvents } from '@/lib/outbox';

export async function POST() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  return NextResponse.json({ success: true, data: await retryPendingEvents() });
}
