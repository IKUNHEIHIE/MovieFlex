import { NextResponse } from 'next/server';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';

export async function POST() {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  return NextResponse.json(
    { success: false, error: '采集任务已迁移，请使用 /api/collect/tasks' },
    { status: 410 },
  );
}
