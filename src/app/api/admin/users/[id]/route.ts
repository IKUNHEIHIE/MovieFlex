import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const actorId = Number(session?.user?.id);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  const id = Number((await params).id);
  const { role } = await request.json();
  if (!Number.isSafeInteger(id) || id < 1 || (role !== 'USER' && role !== 'ADMIN')) return NextResponse.json({ success: false, error: '角色参数无效' }, { status: 400 });
  if (id === actorId && role !== 'ADMIN') return NextResponse.json({ success: false, error: '不能移除自己的管理员权限' }, { status: 400 });
  try {
    const data = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
    return NextResponse.json({ success: true, data });
  } catch { return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 }); }
}
