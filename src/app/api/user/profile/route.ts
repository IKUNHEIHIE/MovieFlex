import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAuthorizationFailure, requireUser } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';
import { validateUserPasswordChange, validateUserProfileUpdate } from '@/lib/user-validation';

export async function PATCH(request: NextRequest) {
  const actor = await requireUser();
  if (isAuthorizationFailure(actor)) return actor;
  const parsed = validateUserProfileUpdate(await request.json());
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const conflict = await prisma.user.findFirst({ where: { id: { not: actor.userId }, OR: [{ username: parsed.username }, { email: parsed.email }] }, select: { id: true } });
  if (conflict) return NextResponse.json({ success: false, error: '用户名或邮箱已被占用' }, { status: 409 });
  const user = await prisma.user.update({ where: { id: actor.userId }, data: parsed, select: { id: true, username: true, email: true, role: true } });
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(request: NextRequest) {
  const actor = await requireUser();
  if (isAuthorizationFailure(actor)) return actor;
  const parsed = validateUserPasswordChange(await request.json());
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { password: true } });
  if (!user || !await bcrypt.compare(parsed.currentPassword, user.password)) return NextResponse.json({ success: false, error: '当前密码不正确' }, { status: 400 });
  await prisma.user.update({ where: { id: actor.userId }, data: { password: await bcrypt.hash(parsed.newPassword, 12) } });
  return NextResponse.json({ success: true });
}
