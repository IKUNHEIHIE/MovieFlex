import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';
import { validateUserProfileUpdate } from '@/lib/user-validation';

export async function POST(request: NextRequest) {
  const actor = await requireAdmin(); if (isAuthorizationFailure(actor)) return actor;
  const body = await request.json(); const profile = validateUserProfileUpdate(body); const password = typeof body.password === 'string' ? body.password : '';
  if ('error' in profile) return NextResponse.json({ success: false, error: profile.error }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ success: false, error: '密码至少6位' }, { status: 400 });
  if (body.role !== undefined && body.role !== 'USER' && body.role !== 'ADMIN') return NextResponse.json({ success: false, error: '角色参数无效' }, { status: 400 });
  const exists = await prisma.user.findFirst({ where: { OR: [{ username: profile.username }, { email: profile.email }] } });
  if (exists) return NextResponse.json({ success: false, error: '用户名或邮箱已被占用' }, { status: 409 });
  const data = await prisma.user.create({ data: { ...profile, password: await bcrypt.hash(password, 12), role: body.role || 'USER' }, select: { id: true, username: true, email: true, role: true } });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
