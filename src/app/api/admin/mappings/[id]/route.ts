import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;
  const id = Number((await params).id); const body = await request.json();
  if (!Number.isSafeInteger(id) || id < 1 || !['MAPPED', 'IGNORED'].includes(body.status)) return NextResponse.json({ success: false, error: '映射参数无效' }, { status: 400 });
  if (body.status === 'MAPPED') {
    if (!Number.isSafeInteger(body.localCategoryId) || body.localCategoryId < 1) return NextResponse.json({ success: false, error: '请选择本地分类' }, { status: 400 });
    const category = await prisma.category.findUnique({ where: { id: body.localCategoryId } });
    if (!category) return NextResponse.json({ success: false, error: '选择的分类不存在' }, { status: 400 });
  }
  try { const data = await prisma.categoryMapping.update({ where: { id }, data: { status: body.status, localCategoryId: body.status === 'MAPPED' ? body.localCategoryId : null, isAuto: false } }); return NextResponse.json({ success: true, data }); }
  catch { return NextResponse.json({ success: false, error: '映射不存在' }, { status: 404 }); }
}
