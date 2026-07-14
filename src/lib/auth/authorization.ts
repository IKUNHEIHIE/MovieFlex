import { NextResponse } from 'next/server';
import { auth } from './auth';
import prisma from '../prisma';

export type AuthorizedUser = { userId: number; role: 'USER' | 'ADMIN' };

function unauthorized() {
  return NextResponse.json({ error: '请先登录' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
}

export function isAuthorizationFailure(value: AuthorizedUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireUser(): Promise<AuthorizedUser | NextResponse> {
  const session = await auth();
  const userId = Number(session?.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) return unauthorized();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return unauthorized();
  return { userId, role: user.role === 'ADMIN' ? 'ADMIN' : 'USER' };
}

export async function requireAdmin(): Promise<AuthorizedUser | NextResponse> {
  const result = await requireUser();
  if (isAuthorizationFailure(result)) return result;
  return result.role === 'ADMIN' ? result : forbidden();
}
