import prisma from '../prisma';
import type { CollectWarning } from './types';

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  '动作片': ['动作', '武侠', '功夫'],
  '喜剧片': ['喜剧', '爆笑'],
  '爱情片': ['爱情', '浪漫'],
  '科幻片': ['科幻', '奇幻'],
  '恐怖片': ['恐怖', '惊悚', '悬疑恐怖'],
  '剧情片': ['剧情', '文艺'],
  '战争片': ['战争', '历史战争'],
  '记录片': ['纪录', '记录', '纪实', '纪录片'],
  '预告片': ['预告', '预告片'],
  '动画片': ['动画', '动画片'],
  '伦理片': ['伦理', '伦理片'],
  '国产剧': ['国产剧', '大陆剧', '内地剧', '国产电视剧', '内地电视剧'],
  '香港剧': ['香港剧', '港澳剧', 'TVB', '港剧'],
  '台湾剧': ['台湾剧', '台剧'],
  '韩国剧': ['韩国剧', '韩剧', '韩国电视剧'],
  '日本剧': ['日本剧', '日剧', '日本电视剧'],
  '欧美剧': ['欧美剧', '美剧', '英剧', '欧美电视剧'],
  '海外剧': ['海外剧'],
  '泰国剧': ['泰国剧', '泰剧'],
  '大陆综艺': ['大陆综艺', '内地综艺'],
  '港台综艺': ['港台综艺', '台湾综艺', '香港综艺'],
  '日韩综艺': ['日韩综艺', '日本综艺', '韩国综艺'],
  '欧美综艺': ['欧美综艺', '美国综艺', '欧洲综艺'],
  '国产动漫': ['国产动漫', '国漫'],
  '日韩动漫': ['日韩动漫', '日本动漫', '韩国动漫', '日漫', '韩漫'],
  '欧美动漫': ['欧美动漫', '美漫'],
  '港台动漫': ['港台动漫'],
  '海外动漫': ['海外动漫'],
  '电影解说': ['电影解说', '解说'],
  '足球': ['足球'],
  '篮球': ['篮球'],
  '网球': ['网球'],
  '斯诺克': ['斯诺克', '台球'],
  '短剧': ['短剧', '微短剧'],
  'AI漫剧': ['AI漫剧', 'AI动漫'],
};

export async function getOrAutoMapCategory(
  sourceKey: string,
  sourceTypeId: number,
  sourceTypeName: string,
  warnings: CollectWarning[],
): Promise<number> {
  const existing = await prisma.categoryMapping.findUnique({
    where: { uk_source_type: { sourceKey, sourceTypeId } },
  });

  if (existing) {
    if (existing.status === 'IGNORED') return 0;

    if (existing.status === 'PENDING_REVIEW') {
      const normalizedName = sourceTypeName.trim();
      const match = Object.entries(CATEGORY_SYNONYMS).find(([, aliases]) =>
        aliases.some((alias) => normalizedName.includes(alias) || alias.includes(normalizedName)),
      );

      if (match) {
        const [categoryName] = match;
        let category = await prisma.category.findFirst({ where: { name: categoryName } });
        if (!category) {
          const slug = `auto-${sourceTypeId}-${Date.now()}`;
          category = await prisma.category.create({ data: { name: categoryName, slug } });
        }

        await prisma.categoryMapping.update({
          where: { id: existing.id },
          data: { localCategoryId: category.id, status: 'MAPPED' },
        });

        return category.id;
      }
    }

    return existing.localCategoryId ?? 0;
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
      reason: '分类未匹配同义词，已归入"其他"等待管理员审核。',
    });
  }

  return category.id;
}
