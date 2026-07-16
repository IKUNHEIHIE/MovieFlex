import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getCached, setCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, remaining } = checkRateLimit(`suggest:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim().slice(0, 50);
  if (!q || q.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  const cacheKey = `suggest:${q}`;
  const cached = getCached<{ id: number; title: string; picUrl: string | null; year: string | null; typeName: string | null }[]>(cacheKey);
  if (cached) {
    return NextResponse.json({ suggestions: cached, fromCache: true });
  }

  const movies = await prisma.movie.findMany({
    where: { title: { contains: q } },
    select: { id: true, title: true, picUrl: true, year: true, typeName: true },
    orderBy: [{ viewCount: 'desc' }, { sourceTime: 'desc' }],
    take: 8,
  });

  setCache(cacheKey, movies, 30);

  return NextResponse.json({ suggestions: movies }, { headers: { 'X-RateLimit-Remaining': String(remaining) } });
}
