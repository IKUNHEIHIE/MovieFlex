import { NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const { searchParams } = new URL(request.url);
  const sourceKey = searchParams.get('sourceKey');

  try {
    const where = sourceKey ? { sourceKey } : {};
    const mappings = await prisma.categoryMapping.findMany({
      where,
      orderBy: [{ sourceKey: 'asc' }, { sourceTypeId: 'asc' }]
    });

    const sources = await prisma.collectSource.findMany({
      select: { sourceKey: true, name: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: { mappings, sources } });
  } catch (error) {
    console.error('Failed to fetch mappings:', error);
    return NextResponse.json(
      { success: false, error: '获取映射失败' },
      { status: 500 }
    );
  }
}
