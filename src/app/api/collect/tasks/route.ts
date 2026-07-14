import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  const tasks = await prisma.collectTask.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  return NextResponse.json({ success: true, data: tasks });
}
