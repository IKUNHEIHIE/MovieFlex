import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get('sort') || 'viewCount';
  const category = searchParams.get('category');

  const where: any = {};
  if (category) {
    where.typeId = parseInt(category);
  }

  const movies = await prisma.movie.findMany({
    where,
    select: {
      id: true,
      title: true,
      viewCount: true,
      typeId: true,
      typeName: true,
      favorites: {
        select: {
          id: true,
        },
      },
      watchHistory: {
        select: {
          id: true,
          progress: true,
        },
      },
    },
    orderBy: {
      [sort]: 'desc',
    },
    take: 50,
  });

  const result = movies.map((movie) => {
    const favoriteCount = movie.favorites.length;
    const avgProgress =
      movie.watchHistory.length > 0
        ? movie.watchHistory.reduce((sum, h) => sum + Number(h.progress), 0) / movie.watchHistory.length
        : 0;

    return {
      id: movie.id,
      title: movie.title,
      viewCount: movie.viewCount,
      favoriteCount,
      avgProgress: Math.round(avgProgress * 100) / 100,
      typeName: movie.typeName,
    };
  });

  return NextResponse.json({ success: true, data: result });
}
