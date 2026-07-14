import { NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';
import { createCollectionTask, dispatchQueuedTasks, recoverCollectionTasks } from '@/lib/collector/task-runner';
import type { CollectTaskMode } from '@/lib/collector/task-types';

export async function GET() {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;
  await recoverCollectionTasks();
  const tasks = await prisma.collectTask.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return NextResponse.json({ success: true, data: tasks });
}

export async function POST(request: Request) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '采集参数无效' }, { status: 400 });
  }

  const { sourceKey, mode } = body as { sourceKey?: unknown; mode?: unknown };
  if (
    typeof sourceKey !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,50}$/.test(sourceKey) ||
    (mode !== 'initial-100' && mode !== 'full')
  ) {
    return NextResponse.json({ success: false, error: '采集参数无效' }, { status: 400 });
  }

  await recoverCollectionTasks();
  const source = await prisma.collectSource.findUnique({ where: { sourceKey } });
  if (!source || !source.isActive) {
    return NextResponse.json({ success: false, error: '采集源不存在或已被禁用' }, { status: 404 });
  }

  const task = await createCollectionTask(sourceKey, mode as CollectTaskMode);
  dispatchQueuedTasks();
  return NextResponse.json({ success: true, data: task }, { status: 202 });
}
