import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function currentUserId() { const session = await auth(); const id = Number(session?.user?.id); return Number.isSafeInteger(id) && id > 0 ? id : null; }
export async function POST(_request: NextRequest, { params }: { params: Promise<{ movieId: string }> }) {
  const userId = await currentUserId(); const movieId = Number((await params).movieId); if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 }); if (!Number.isSafeInteger(movieId) || movieId < 1) return NextResponse.json({ success: false, error: '影片无效' }, { status: 400 });
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } }); if (!movie) return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });
  await prisma.userFavorite.upsert({ where: { uk_user_movie: { userId, movieId } }, create: { userId, movieId }, update: {} }); return NextResponse.json({ success: true });
}
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ movieId: string }> }) {
  const userId = await currentUserId(); const movieId = Number((await params).movieId); if (!userId) return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  await prisma.userFavorite.deleteMany({ where: { userId, movieId } }); return NextResponse.json({ success: true });
}
