import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  // Get all parent categories (no parent_id)
  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  });

  // For each parent category, get its children and aggregate stats
  const result = await Promise.all(
    parentCategories.map(async (parent) => {
      // Get child categories
      const children = await prisma.category.findMany({
        where: { parentId: parent.id },
        select: { id: true },
      });

      const categoryIds = [parent.id, ...children.map((c) => c.id)];

      // Count movies in these categories
      const movieCount = await prisma.movie.count({
        where: { typeId: { in: categoryIds } },
      });

      // Sum viewCount for all movies in these categories
      const viewStats = await prisma.movie.aggregate({
        where: { typeId: { in: categoryIds } },
        _sum: { viewCount: true },
      });

      // Count favorites for movies in these categories
      const favoriteCount = await prisma.userFavorite.count({
        where: {
          movie: {
            typeId: { in: categoryIds },
          },
        },
      });

      return {
        id: parent.id,
        name: parent.name,
        movieCount,
        totalViews: viewStats._sum.viewCount || 0,
        totalFavorites: favoriteCount,
      };
    })
  );

  return NextResponse.json({ success: true, data: result });
}
