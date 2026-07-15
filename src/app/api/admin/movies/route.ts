import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizationFailure, requireAdmin } from '@/lib/auth/authorization';
import { normalizeMetadataValue } from '@/lib/metadata-normalization';
import prisma from '@/lib/prisma';

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

export async function POST(request: NextRequest) {
  const actor = await requireAdmin();
  if (isAuthorizationFailure(actor)) return actor;

  const parsed = parseMoviePayload(await request.json());
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id: parsed.data.typeId }, select: { id: true, name: true } });
  if (!category) return NextResponse.json({ success: false, error: '请选择有效分类' }, { status: 400 });

  const maxVodId = await prisma.movie.aggregate({ where: { sourceKey: 'manual' }, _max: { vodId: true } });
  const data = await prisma.movie.create({
    data: {
      ...parsed.data,
      typeName: category.name,
      sourceKey: 'manual',
      vodId: (maxVodId._max.vodId ?? 0) + 1,
    },
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
