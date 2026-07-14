import { NextResponse } from 'next/server';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';
import { mutateCollectionTask } from '@/lib/collector/task-runner';

export async function PATCH(request: Request, context: RouteContext<'/api/collect/tasks/[id]'>) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '任务操作无效' }, { status: 400 });
  }

  const action = (body as { action?: unknown }).action;
  if (action !== 'pause' && action !== 'resume' && action !== 'cancel') {
    return NextResponse.json({ success: false, error: '任务操作无效' }, { status: 400 });
  }

  const { id } = await context.params;
  const task = await mutateCollectionTask(id, action);
  if (!task) return NextResponse.json({ success: false, error: '采集任务不存在' }, { status: 404 });

  return NextResponse.json({ success: true, data: task });
}
