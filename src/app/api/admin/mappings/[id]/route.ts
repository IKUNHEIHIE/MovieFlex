import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  const id = Number((await params).id); const body = await request.json();
  if (!Number.isSafeInteger(id) || id < 1 || !['MAPPED', 'IGNORED'].includes(body.status)) return NextResponse.json({ success: false, error: '映射参数无效' }, { status: 400 });
  if (body.status === 'MAPPED' && (!Number.isSafeInteger(body.localCategoryId) || body.localCategoryId < 1)) return NextResponse.json({ success: false, error: '请选择本地分类' }, { status: 400 });
  try { const data = await prisma.categoryMapping.update({ where: { id }, data: { status: body.status, localCategoryId: body.status === 'MAPPED' ? body.localCategoryId : null, isAuto: false } }); return NextResponse.json({ success: true, data }); }
  catch { return NextResponse.json({ success: false, error: '映射不存在' }, { status: 404 }); }
}
