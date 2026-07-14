import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const { searchParams } = new URL(request.url);
  const sourceKey = searchParams.get('sourceKey');

  if (!sourceKey || typeof sourceKey !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(sourceKey)) {
    return NextResponse.json({ success: false, error: '来源标识无效' }, { status: 400 });
  }

  try {
    const mappings = await prisma.categoryMapping.findMany({
      where: { sourceKey }
    });

    if (mappings.length === 0) {
      return NextResponse.json({ success: false, error: '该来源没有分类映射' }, { status: 404 });
    }

    let updated = 0;

    for (const mapping of mappings) {
      if (mapping.status === 'MAPPED' && mapping.localCategoryId) {
        const result = await prisma.movie.updateMany({
          where: {
            sourceKey,
            typeName: mapping.sourceTypeName
          },
          data: {
            typeId: mapping.localCategoryId
          }
        });
        updated += result.count;
      }
    }

    return NextResponse.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('Failed to reclassify movies:', error);
    return NextResponse.json(
      { success: false, error: '重新分类失败' },
      { status: 500 }
    );
  }
}
