import { NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import { retryPendingEvents } from '@/lib/outbox';

export async function POST() {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;
  return NextResponse.json({ success: true, data: await retryPendingEvents() });
}
