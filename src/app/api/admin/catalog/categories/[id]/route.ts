import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthorizationFailure } from '@/lib/auth/authorization';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { name, slug, sortOrder } = body;

    const existing = await prisma.category.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug }
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'slug已存在' },
          { status: 400 }
        );
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(sortOrder !== undefined && { sortOrder })
      }
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { success: false, error: '更新分类失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { children: true }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    if (existing.children.length > 0) {
      return NextResponse.json(
        { success: false, error: '请先删除子分类' },
        { status: 400 }
      );
    }

    const movieCount = await prisma.movie.count({
      where: { typeId: id }
    });

    if (movieCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '该分类下有影片，请先迁移影片或选择级联删除'
        },
        { status: 400 }
      );
    }

    const mappingCount = await prisma.categoryMapping.count({
      where: { localCategoryId: id }
    });

    if (mappingCount > 0) {
      return NextResponse.json(
        { success: false, error: '该分类已被资源站分类绑定' },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    );
  }
}
