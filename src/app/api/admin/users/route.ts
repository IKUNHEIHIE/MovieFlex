import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';
import { validateUserProfileUpdate } from '@/lib/user-validation';

export async function GET(request: NextRequest) {
  const actor = await requireAdmin(); if (isAuthorizationFailure(actor)) return actor;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSizeOptions = [20, 50, 100];
  const requestedPageSize = Number(searchParams.get('pageSize')) || 20;
  const pageSize = pageSizeOptions.find(size => size >= requestedPageSize) || 20;

  const where = search.trim()
    ? { OR: [{ username: { contains: search.trim(), mode: 'insensitive' } }, { email: { contains: search.trim(), mode: 'insensitive' } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { favorites: true, watchHistory: true } } } }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  return NextResponse.json({ success: true, data: { users: users.map(({ id, username, email, role, _count, createdAt }) => ({ id, username, email, role, favoritesCount: _count.favorites, watchHistoryCount: _count.watchHistory, createdAt: createdAt.toISOString() })), total, page: currentPage, pageSize, totalPages } });
}

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
