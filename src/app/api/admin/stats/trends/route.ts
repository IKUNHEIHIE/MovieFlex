import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const globalStats = await prisma.dailyStats.findMany({
    where: {
      date: {
        gte: startDate,
      },
      dimension: 'global',
    },
    orderBy: {
      date: 'asc',
    },
  });

  const result = globalStats.map((stat) => {
    const date = stat.date.toISOString().split('T')[0];
    const guest转化率 = stat.totalViews > 0 ? (stat.userViews / stat.totalViews) * 100 : 0;

    return {
      date,
      totalViews: stat.totalViews,
      userViews: stat.userViews,
      guestViews: stat.guestViews,
      totalFavorites: stat.totalFavorites,
      uniqueUsers: stat.uniqueUsers,
      conversionRate: Math.round(guest转化率 * 100) / 100,
    };
  });

  // Calculate averages
  const avgDailyViews =
    result.length > 0 ? result.reduce((sum, r) => sum + r.totalViews, 0) / result.length : 0;
  const avgDailyFavorites =
    result.length > 0 ? result.reduce((sum, r) => sum + r.totalFavorites, 0) / result.length : 0;
  const avgDAU =
    result.length > 0 ? result.reduce((sum, r) => sum + r.uniqueUsers, 0) / result.length : 0;

  return NextResponse.json({
    success: true,
    data: {
      trends: result,
      summary: {
        avgDailyViews: Math.round(avgDailyViews),
        avgDailyFavorites: Math.round(avgDailyFavorites),
        avgDAU: Math.round(avgDAU),
        totalDays: result.length,
      },
    },
  });
}
