import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';
import { normalizeMetadataValue } from '@/lib/metadata-normalization';
import { replaceMovieMetadataRelations } from '@/lib/movie-metadata-relations';
import prisma from '@/lib/prisma';

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseMoviePayload(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const typeId = Number(body.typeId);
  const year = body.year === '' || body.year === undefined ? null : Number(body.year);
  const score = body.score === '' || body.score === undefined ? 0 : Number(body.score);

  if (!title || title.length > 255) return { error: '影片名称无效' } as const;
  if (!Number.isSafeInteger(typeId) || typeId < 1) return { error: '请选择有效分类' } as const;
  if (year !== null && (!Number.isSafeInteger(year) || year < 1900 || year > 2100)) return { error: '年份无效' } as const;
  if (!Number.isFinite(score) || score < 0 || score > 10) return { error: '评分无效' } as const;

  const area = typeof body.area === 'string' ? body.area.trim() || null : null;
  const language = typeof body.language === 'string' ? body.language.trim() || null : null;

  return {
    data: {
      title,
      typeId,
      director: typeof body.director === 'string' ? body.director.trim() || null : null,
      actors: typeof body.actors === 'string' ? body.actors.trim() || null : null,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      year,
      area,
      language,
      areaClean: normalizeMetadataValue(area),
      languageClean: normalizeMetadataValue(language),
      picUrl: typeof body.picUrl === 'string' ? body.picUrl.trim() || null : null,
      score,
    },
  } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: '影片参数无效' }, { status: 400 });

  try {
    const movie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!movie) {
      return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    console.error('Failed to fetch film:', error);
    return NextResponse.json({ success: false, error: '读取影片失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: '影片参数无效' }, { status: 400 });

  const parsed = parseMoviePayload(await request.json());
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id: parsed.data.typeId }, select: { id: true, name: true } });
  if (!category) return NextResponse.json({ success: false, error: '请选择有效分类' }, { status: 400 });

  try {
    const movie = await prisma.movie.update({
      where: { id },
      data: {
        ...parsed.data,
        typeName: category.name,
      },
    });
    await replaceMovieMetadataRelations(prisma, movie.id, parsed.data.area, parsed.data.language);

    return NextResponse.json({ success: true, data: movie });
  } catch (error) {
    console.error('Failed to update film:', error);
    return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: '影片参数无效' }, { status: 400 });

  try {
    await prisma.movie.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete film:', error);
    return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });
  }
}
