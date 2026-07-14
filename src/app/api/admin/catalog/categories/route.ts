import { NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function GET() {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        movieCount: await prisma.movie.count({
          where: { typeId: cat.id }
        }),
        children: await Promise.all(
          cat.children.map(async (child) => ({
            ...child,
            movieCount: await prisma.movie.count({
              where: { typeId: child.id }
            })
          }))
        )
      }))
    );

    return NextResponse.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { success: false, error: '获取分类失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  try {
    const body = await request.json();
    const { name, slug, parentId, sortOrder = 0 } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: '名称和slug不能为空' },
        { status: 400 }
      );
    }

    const existingSlug = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: 'slug已存在' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
        sortOrder
      }
    });

    // 如果创建了子分类，返回父分类的完整信息
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        include: { children: { orderBy: { sortOrder: 'asc' } } }
      });
      return NextResponse.json({ success: true, data: parent });
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { success: false, error: '创建分类失败' },
      { status: 500 }
    );
  }
}
