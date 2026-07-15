import { XMLParser } from 'fast-xml-parser';
import { toStringValue, toPositiveInteger, parseSourceTime } from './utils';
import { getOrAutoMapCategory } from './category';
import { normalizeMetadataValue } from '../metadata-normalization';
import type { RawMovie, SourceFormat, CollectWarning, CollectResult, CollectPageInput } from './types';
import prisma from '../prisma';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
});

export async function fetchRawText(
  apiUrl: string,
  params: Record<string, string | number> = {},
): Promise<string> {
  const url = new URL(apiUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'MovieFlex-Collector/1.0' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Resource API request failed with status ${response.status}`);
  }

  return response.text();
}

export function normalizeXmlList(xmlText: string): RawMovie[] {
  const parsed = xmlParser.parse(xmlText) as {
    rss?: { list?: { video?: unknown | unknown[] } };
  };
  const videos = parsed.rss?.list?.video;
  if (!videos) return [];

  return (Array.isArray(videos) ? videos : [videos]).map((video) => {
    const item = video as Record<string, unknown>;
    const dd = (item.dl as Record<string, unknown> | undefined)?.dd;
    const playNodes = dd ? (Array.isArray(dd) ? dd : [dd]) : [];
    const playFrom: string[] = [];
    const playUrl: string[] = [];

    for (const node of playNodes) {
      const entry = node as Record<string, unknown>;
      playFrom.push(toStringValue(entry['@_flag']) || 'unknown');
      playUrl.push(toStringValue(entry['#text']));
    }

    return {
      vod_id: toStringValue(item.id),
      vod_name: toStringValue(item.name),
      type_id: toStringValue(item.tid),
      type_name: toStringValue(item.type),
      vod_pic: toStringValue(item.pic),
      vod_actor: toStringValue(item.actor),
      vod_director: toStringValue(item.director),
      vod_area: toStringValue(item.area),
      vod_lang: toStringValue(item.lang),
      vod_year: toStringValue(item.year),
      vod_remarks: toStringValue(item.note),
      vod_content: toStringValue(item.des),
      vod_play_from: playFrom.join('$$$'),
      vod_play_url: playUrl.join('$$$'),
      vod_time: toStringValue(item.last),
    };
  });
}

async function saveNormalizedMovies(
  movies: RawMovie[],
  sourceKey: string,
  warnings: CollectWarning[],
): Promise<number> {
  let saved = 0;

  for (const movie of movies) {
    const vodId = toPositiveInteger(movie.vod_id);
    if (!vodId || !movie.vod_name) continue;

    try {
      const sourceTypeId = toPositiveInteger(movie.type_id);
      const localCategoryId = await getOrAutoMapCategory(
        sourceKey,
        sourceTypeId,
        movie.type_name ?? '未分类',
        warnings,
      );
      if (!localCategoryId) continue;

      const sharedData = {
        title: movie.vod_name,
        titleEn: movie.vod_en || null,
        typeId: localCategoryId,
        typeName: movie.type_name || null,
        picUrl: movie.vod_pic || null,
        director: movie.vod_director || null,
        actors: movie.vod_actor || null,
        area: movie.vod_area || null,
        language: movie.vod_lang || null,
        areaClean: normalizeMetadataValue(movie.vod_area),
        languageClean: normalizeMetadataValue(movie.vod_lang),
        year: toPositiveInteger(movie.vod_year) || null,
        remarks: movie.vod_remarks || null,
        description: movie.vod_content || null,
        playFrom: movie.vod_play_from || null,
        playUrl: movie.vod_play_url || null,
        sourceTime: parseSourceTime(movie.vod_time),
      };

      const existing = await prisma.movie.findUnique({ where: { uk_source_vod: { sourceKey, vodId } } });
      if (!existing) {
        await prisma.movie.create({ data: { vodId, sourceKey, ...sharedData } });
      } else if (!existing.sourceTime || !sharedData.sourceTime || sharedData.sourceTime >= existing.sourceTime) {
        const update = Object.fromEntries(Object.entries(sharedData).map(([key, value]) => [key, value ?? existing[key as keyof typeof existing]]));
        await prisma.movie.update({ where: { id: existing.id }, data: update });
      }
      saved += 1;
    } catch (error) {
      console.error(`Failed to save collected movie ${movie.vod_name}:`, error);
    }
  }

  return saved;
}

export async function collectPage({
  sourceKey,
  apiUrl,
  format,
  page,
  recentHours,
}: CollectPageInput,
): Promise<CollectResult> {
  const params: Record<string, string | number> = { ac: 'detail', pg: page };
  if (recentHours !== undefined) params.h = recentHours;

  const text = await fetchRawText(apiUrl, params);
  const warnings: CollectWarning[] = [];
  let movies: RawMovie[] = [];
  let pageCount = 1;

  if (format === 'JSON') {
    const payload = JSON.parse(text) as {
      list?: RawMovie[];
      pagecount?: string | number;
      class?: Array<{ type_id?: string | number; type_name?: string }>;
    };
    movies = payload.list ?? [];
    pageCount = toPositiveInteger(payload.pagecount) || 1;

    for (const category of payload.class ?? []) {
      await getOrAutoMapCategory(
        sourceKey,
        toPositiveInteger(category.type_id),
        category.type_name ?? '未分类',
        warnings,
      );
    }
  } else {
    const parsed = xmlParser.parse(text) as {
      rss?: {
        list?: { '@_pagecount'?: string | number };
        class?: { ty?: unknown | unknown[] };
      };
    };
    movies = normalizeXmlList(text);
    pageCount = toPositiveInteger(parsed.rss?.list?.['@_pagecount']) || 1;

    const types = parsed.rss?.class?.ty;
    for (const rawType of types ? (Array.isArray(types) ? types : [types]) : []) {
      const category = rawType as Record<string, unknown>;
      await getOrAutoMapCategory(
        sourceKey,
        toPositiveInteger(category['@_id']),
        toStringValue(category['#text']) || '未分类',
        warnings,
      );
    }
  }

  const saved = await saveNormalizedMovies(movies, sourceKey, warnings);
  const uniqueWarnings = warnings.filter(
    (warning, index, entries) =>
      entries.findIndex((item) => item.sourceTypeId === warning.sourceTypeId) === index,
  );

  return { fetched: movies.length, saved, pageCount, warnings: uniqueWarnings };
}

/** @deprecated Use collectPage with an explicit page and optional recentHours instead. */
export async function runCollect(
  sourceKey: string,
  apiUrl: string,
  format: SourceFormat,
  params: Record<string, string | number> = {},
): Promise<CollectResult> {
  const page = toPositiveInteger(params.pg) || 1;
  const recentHours = params.h === undefined ? undefined : toPositiveInteger(params.h);

  return collectPage({
    sourceKey,
    apiUrl,
    format,
    page,
    ...(recentHours ? { recentHours } : {}),
  });
}
