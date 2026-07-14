import { XMLParser } from 'fast-xml-parser';
import prisma from './prisma';

type SourceFormat = 'JSON' | 'XML';

type RawMovie = {
  vod_id: number | string;
  vod_name?: string;
  vod_en?: string;
  type_id?: number | string;
  type_name?: string;
  vod_pic?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_area?: string;
  vod_lang?: string;
  vod_year?: string | number;
  vod_remarks?: string;
  vod_content?: string;
  vod_play_from?: string;
  vod_play_url?: string;
  vod_time?: string;
};

interface CollectWarning {
  sourceTypeId: number;
  sourceTypeName: string;
  reason: string;
}

interface CollectResult {
  fetched: number;
  saved: number;
  pageCount: number;
  warnings: CollectWarning[];
}

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  '动作片': ['动作', '武侠', '功夫'],
  '喜剧片': ['喜剧', '爆笑'],
  '爱情片': ['爱情', '浪漫'],
  '科幻片': ['科幻', '奇幻'],
  '恐怖片': ['恐怖', '惊悚', '悬疑恐怖'],
  '剧情片': ['剧情', '文艺'],
  '战争片': ['战争', '历史战争'],
  '纪录片': ['纪录', '记录', '纪实'],
  '大陆剧': ['国产剧', '大陆剧', '内地剧', '国产电视剧', '内地电视剧'],
  '欧美剧': ['美剧', '英剧', '欧美剧', '欧美电视剧', '海外剧'],
  '韩剧': ['韩剧', '韩国剧', '韩国电视剧'],
  '日剧': ['日剧', '日本剧', '日本电视剧'],
  '港澳剧': ['港澳剧', '香港剧', 'TVB', '港剧'],
  '台湾剧': ['台湾剧', '台剧'],
  '泰剧': ['泰剧', '泰国剧'],
  '国产动漫': ['国产动漫', '国漫'],
  '日韩动漫': ['日韩动漫', '日本动漫', '韩国动漫', '日漫', '韩漫'],
  '欧美动漫': ['欧美动漫', '美漫'],
  '大陆综艺': ['大陆综艺', '内地综艺', '综艺片'],
  '港台综艺': ['港台综艺', '台湾综艺', '香港综艺'],
  '日韩综艺': ['日韩综艺', '日本综艺', '韩国综艺'],
  '欧美综艺': ['欧美综艺', '美国综艺', '欧洲综艺'],
};

function toStringValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text'] ?? '');
  }
  return value == null ? '' : String(value);
}

function toPositiveInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function parseSourceTime(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export class MovieCollector {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });

  async fetchRawText(
    apiUrl: string,
    params: Record<string, string | number> = {},
  ): Promise<string> {
    const url = new URL(apiUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'MovieFlex-Collector/1.0' },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`Resource API request failed with status ${response.status}`);
    }

    return response.text();
  }

  async getOrAutoMapCategory(
    sourceKey: string,
    sourceTypeId: number,
    sourceTypeName: string,
    warnings: CollectWarning[],
  ): Promise<number> {
    const existing = await prisma.categoryMapping.findUnique({
      where: { uk_source_type: { sourceKey, sourceTypeId } },
    });

    if (existing) {
      return existing.status === 'IGNORED' ? 0 : (existing.localCategoryId ?? 0);
    }

    const normalizedName = sourceTypeName.trim();
    const match = Object.entries(CATEGORY_SYNONYMS).find(([, aliases]) =>
      aliases.some((alias) => normalizedName.includes(alias) || alias.includes(normalizedName)),
    );
    const categoryName = match?.[0] ?? '其他';
    const status = match ? 'MAPPED' : 'PENDING_REVIEW';

    let category = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!category) {
      const slug = categoryName === '其他' ? 'other' : `auto-${sourceTypeId}-${Date.now()}`;
      category = await prisma.category.create({ data: { name: categoryName, slug } });
    }

    try {
      await prisma.categoryMapping.create({
        data: { sourceKey, sourceTypeId, sourceTypeName: normalizedName || '未命名分类', localCategoryId: category.id, status, isAuto: true },
      });
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) throw error;
      const concurrent = await prisma.categoryMapping.findUnique({ where: { uk_source_type: { sourceKey, sourceTypeId } } });
      return concurrent?.status === 'IGNORED' ? 0 : (concurrent?.localCategoryId ?? 0);
    }

    if (!match) {
      warnings.push({
        sourceTypeId,
        sourceTypeName: normalizedName || '未命名分类',
        reason: '分类未匹配同义词，已归入“其他”等待管理员审核。',
      });
    }

    return category.id;
  }

  async saveNormalizedMovies(
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
        const localCategoryId = await this.getOrAutoMapCategory(
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

  normalizeXmlList(xmlText: string): RawMovie[] {
    const parsed = this.xmlParser.parse(xmlText) as {
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

  async runCollect(
    sourceKey: string,
    apiUrl: string,
    format: SourceFormat,
    params: Record<string, string | number> = {},
  ): Promise<CollectResult> {
    const text = await this.fetchRawText(apiUrl, params);
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
        await this.getOrAutoMapCategory(
          sourceKey,
          toPositiveInteger(category.type_id),
          category.type_name ?? '未分类',
          warnings,
        );
      }
    } else {
      const parsed = this.xmlParser.parse(text) as {
        rss?: {
          list?: { '@_pagecount'?: string | number };
          class?: { ty?: unknown | unknown[] };
        };
      };
      movies = this.normalizeXmlList(text);
      pageCount = toPositiveInteger(parsed.rss?.list?.['@_pagecount']) || 1;

      const types = parsed.rss?.class?.ty;
      for (const rawType of types ? (Array.isArray(types) ? types : [types]) : []) {
        const category = rawType as Record<string, unknown>;
        await this.getOrAutoMapCategory(
          sourceKey,
          toPositiveInteger(category['@_id']),
          toStringValue(category['#text']) || '未分类',
          warnings,
        );
      }
    }

    const saved = await this.saveNormalizedMovies(movies, sourceKey, warnings);
    const uniqueWarnings = warnings.filter(
      (warning, index, entries) =>
        entries.findIndex((item) => item.sourceTypeId === warning.sourceTypeId) === index,
    );

    return { fetched: movies.length, saved, pageCount, warnings: uniqueWarnings };
  }
}

export const collector = new MovieCollector();
