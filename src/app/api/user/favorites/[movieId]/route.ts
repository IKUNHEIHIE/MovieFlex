import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ movieId: string }> }) {
  const actor = await requireUser();
  if (isAuthorizationFailure(actor)) return actor;
  const movieId = Number((await params).movieId);
  if (!Number.isSafeInteger(movieId) || movieId < 1) return NextResponse.json({ success: false, error: '影片无效' }, { status: 400 });
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } }); if (!movie) return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });
  await prisma.userFavorite.upsert({ where: { uk_user_movie: { userId: actor.userId, movieId } }, create: { userId: actor.userId, movieId }, update: {} }); return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ movieId: string }> }) {
  const actor = await requireUser();
  if (isAuthorizationFailure(actor)) return actor;
  const movieId = Number((await params).movieId);
  await prisma.userFavorite.deleteMany({ where: { userId: actor.userId, movieId } }); return NextResponse.json({ success: true });
}
