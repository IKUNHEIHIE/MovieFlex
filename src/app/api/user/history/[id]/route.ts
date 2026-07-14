import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); const userId = Number(session?.user?.id); const id = Number((await params).id);
  if (!Number.isSafeInteger(userId) || userId < 1) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ success: false, error: '记录无效' }, { status: 400 });
  await prisma.watchHistory.deleteMany({ where: { id, userId } }); return NextResponse.json({ success: true });
}
