import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { validateUserProfileUpdate } from '@/lib/user-validation';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;
  
  const id = Number((await params).id);
  const body = await request.json(); const { role } = body;
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ success: false, error: '用户参数无效' }, { status: 400 });
  if (role !== undefined && role !== 'USER' && role !== 'ADMIN') return NextResponse.json({ success: false, error: '角色参数无效' }, { status: 400 });
  if (id === actor.userId && role === 'USER') return NextResponse.json({ success: false, error: '不能移除自己的管理员权限' }, { status: 400 });
  try {
    const profile = validateUserProfileUpdate({ username: body.username ?? 'placeholder', email: body.email ?? 'placeholder@example.com' });
    if ((body.username !== undefined || body.email !== undefined) && 'error' in profile) return NextResponse.json({ success: false, error: profile.error }, { status: 400 });
    const conflict = body.username !== undefined || body.email !== undefined ? await prisma.user.findFirst({ where: { id: { not: id }, OR: [{ username: body.username }, { email: body.email }] } }) : null;
    if (conflict) return NextResponse.json({ success: false, error: '用户名或邮箱已被占用' }, { status: 409 });
    if (typeof body.password === 'string' && body.password.length > 0 && body.password.length < 6) return NextResponse.json({ success: false, error: '密码至少6位' }, { status: 400 });
    const data = await prisma.user.update({ where: { id }, data: { ...(role !== undefined ? { role } : {}), ...(body.username !== undefined ? { username: profile.username } : {}), ...(body.email !== undefined ? { email: profile.email } : {}), ...(typeof body.password === 'string' && body.password.length >= 6 ? { password: await bcrypt.hash(body.password, 12) } : {}) }, select: { id: true, username: true, email: true, role: true } });
    return NextResponse.json({ success: true, data });
  } catch { return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin(); if (isAuthorizationFailure(actor)) return actor;
  const id = Number((await params).id); const { confirmUsername } = await request.json();
  if (!Number.isSafeInteger(id) || id < 1 || id === actor.userId) return NextResponse.json({ success: false, error: '不能删除当前管理员账号' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id }, select: { username: true } });
  if (!user) return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
  if (confirmUsername !== user.username) return NextResponse.json({ success: false, error: '确认用户名不匹配' }, { status: 400 });
  await prisma.user.delete({ where: { id } }); return NextResponse.json({ success: true });
}
