import 'dotenv/config';
import prisma from '../src/lib/prisma';

export const DEFAULT_CATEGORIES = [
  {
    name: '电影片', slug: 'movie', sortOrder: 1,
    children: [
      { name: '动作片', slug: 'action', sortOrder: 1 },
      { name: '喜剧片', slug: 'comedy', sortOrder: 2 },
      { name: '爱情片', slug: 'romance', sortOrder: 3 },
      { name: '科幻片', slug: 'sci-fi', sortOrder: 4 },
      { name: '恐怖片', slug: 'horror', sortOrder: 5 },
      { name: '剧情片', slug: 'drama', sortOrder: 6 },
      { name: '战争片', slug: 'war', sortOrder: 7 },
      { name: '伦理片', slug: 'erotic', sortOrder: 8 },
      { name: '记录片', slug: 'documentary-film', sortOrder: 9 },
      { name: '预告片', slug: 'trailer', sortOrder: 10 },
      { name: '动画片', slug: 'animation-film', sortOrder: 11 },
    ],
  },
  {
    name: '连续剧', slug: 'tv-series', sortOrder: 2,
    children: [
      { name: '国产剧', slug: 'domestic', sortOrder: 1 },
      { name: '香港剧', slug: 'hong-kong', sortOrder: 2 },
      { name: '台湾剧', slug: 'taiwan', sortOrder: 3 },
      { name: '韩国剧', slug: 'korean', sortOrder: 4 },
      { name: '日本剧', slug: 'japanese', sortOrder: 5 },
      { name: '欧美剧', slug: 'western', sortOrder: 6 },
      { name: '海外剧', slug: 'overseas', sortOrder: 7 },
      { name: '泰国剧', slug: 'thai', sortOrder: 8 },
    ],
  },
  {
    name: '综艺片', slug: 'variety', sortOrder: 3,
    children: [
      { name: '大陆综艺', slug: 'mainland-variety', sortOrder: 1 },
      { name: '港台综艺', slug: 'hk-tw-variety', sortOrder: 2 },
      { name: '日韩综艺', slug: 'jp-kr-variety', sortOrder: 3 },
      { name: '欧美综艺', slug: 'western-variety', sortOrder: 4 },
    ],
  },
  {
    name: '动漫片', slug: 'anime', sortOrder: 4,
    children: [
      { name: '国产动漫', slug: 'domestic-anime', sortOrder: 1 },
      { name: '日韩动漫', slug: 'jp-kr-anime', sortOrder: 2 },
      { name: '欧美动漫', slug: 'western-anime', sortOrder: 3 },
      { name: '港台动漫', slug: 'hk-tw-anime', sortOrder: 4 },
      { name: '海外动漫', slug: 'overseas-anime', sortOrder: 5 },
    ],
  },
  {
    name: '纪录片', slug: 'documentary', sortOrder: 5,
    children: [],
  },
  {
    name: '电影解说', slug: 'movie-commentary', sortOrder: 6,
    children: [],
  },
  {
    name: '体育', slug: 'sports', sortOrder: 7,
    children: [
      { name: '足球', slug: 'football', sortOrder: 1 },
      { name: '篮球', slug: 'basketball', sortOrder: 2 },
      { name: '网球', slug: 'tennis', sortOrder: 3 },
      { name: '斯诺克', slug: 'snooker', sortOrder: 4 },
    ],
  },
  {
    name: '短剧', slug: 'mini-drama', sortOrder: 8,
    children: [],
  },
  {
    name: 'AI漫剧', slug: 'ai-comic', sortOrder: 9,
    children: [],
  },
  {
    name: '其他', slug: 'other', sortOrder: 10,
    children: [],
  },
];

export async function seedDefaultCategories() {
  for (const parent of DEFAULT_CATEGORIES) {
    const existingParent = await prisma.category.findUnique({
      where: { slug: parent.slug }
    });

    let parentId: number;
    if (existingParent) {
      parentId = existingParent.id;
      await prisma.category.update({
        where: { id: parentId },
        data: {
          name: parent.name,
          sortOrder: parent.sortOrder,
          parentId: null
        }
      });
    } else {
      const created = await prisma.category.create({
        data: {
          name: parent.name,
          slug: parent.slug,
          sortOrder: parent.sortOrder,
          parentId: null
        }
      });
      parentId = created.id;
    }

    for (const child of parent.children) {
      const existingChild = await prisma.category.findUnique({
        where: { slug: child.slug }
      });

      if (existingChild) {
        await prisma.category.update({
          where: { id: existingChild.id },
          data: {
            name: child.name,
            sortOrder: child.sortOrder,
            parentId: parentId
          }
        });
      } else {
        await prisma.category.create({
          data: {
            name: child.name,
            slug: child.slug,
            sortOrder: child.sortOrder,
            parentId: parentId
          }
        });
      }
    }
  }
}

async function main() {
  console.log('开始初始化两层分类结构...');

  await seedDefaultCategories();

  console.log('\n完成。当前分类列表：');
  const all = await prisma.category.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  });
  for (const p of all) {
    console.log(`${p.name} (${p.slug}) - 共 ${p.children.length} 个子分类`);
    for (const c of p.children) {
      console.log(`  └── ${c.name} (${c.slug})`);
    }
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
