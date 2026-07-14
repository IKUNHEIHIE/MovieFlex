import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
  const { themeKey } = await request.json();
  if (typeof themeKey !== 'string' || !/^[a-z0-9-]{1,50}$/.test(themeKey)) return NextResponse.json({ success: false, error: '主题标识无效' }, { status: 400 });
  if (themeKey !== 'ice-blue' && !await prisma.theme.findUnique({ where: { themeKey }, select: { id: true } })) return NextResponse.json({ success: false, error: '主题不存在' }, { status: 404 });
  await prisma.systemSetting.upsert({ where: { key: 'active_theme' }, create: { key: 'active_theme', value: themeKey }, update: { value: themeKey } });
  return NextResponse.json({ success: true });
}
