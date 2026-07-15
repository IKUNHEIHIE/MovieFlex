import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      watchHistory: {
        select: {
          id: true,
          movieId: true,
          progress: true,
        },
      },
      favorites: {
        select: {
          id: true,
        },
      },
    },
    take: 100,
    orderBy: {
      watchHistory: {
        _count: 'desc',
      },
    },
  });

  const result = users.map((user) => {
    const watchCount = user.watchHistory.length;
    const uniqueMovies = new Set(user.watchHistory.map((h) => h.movieId)).size;
    const avgProgress =
      user.watchHistory.length > 0
        ? user.watchHistory.reduce((sum, h) => sum + Number(h.progress), 0) / user.watchHistory.length
        : 0;

    let activityLevel = 'low';
    if (watchCount > 50) activityLevel = 'high';
    else if (watchCount >= 10) activityLevel = 'medium';

    return {
      id: user.id,
      username: user.username,
      watchCount,
      uniqueMovies,
      favoriteCount: user.favorites.length,
      avgProgress: Math.round(avgProgress * 100) / 100,
      activityLevel,
    };
  });

  return NextResponse.json({ success: true, data: result });
}
