import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
  '体育': ['体育'],
};

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceKey = searchParams.get('sourceKey');
    const dryRun = searchParams.get('dryRun') === 'true';

    // 查询所有待审核的映射
    const pending = await prisma.categoryMapping.findMany({
      where: {
        status: 'PENDING_REVIEW',
        ...(sourceKey && { sourceKey })
      }
    });

    const results: any[] = [];
    let totalMoviesUpdated = 0;

    for (const mapping of pending) {
      const normalizedName = mapping.sourceTypeName.trim();
      
      // 重新运行同义词匹配
      const match = Object.entries(CATEGORY_SYNONYMS).find(([, synonyms]) =>
        synonyms.some(synonym => 
          normalizedName.includes(synonym) || synonym.includes(normalizedName)
        )
      );

      if (match) {
        const [categoryName] = match;
        const category = await prisma.category.findFirst({
          where: { name: categoryName }
        });

        if (category) {
          // 更新所有匹配的电影
          const moviesUpdated = await prisma.movie.updateMany({
            where: {
              sourceKey: mapping.sourceKey,
              typeName: mapping.sourceTypeName
            },
            data: { typeId: category.id }
          });

          totalMoviesUpdated += moviesUpdated.count;

          // 如果不是 dry run，实际更新映射状态
          if (!dryRun) {
            await prisma.categoryMapping.update({
              where: { id: mapping.id },
              data: {
                localCategoryId: category.id,
                status: 'MAPPED'
              }
            });
          }

          results.push({
            id: mapping.id,
            sourceKey: mapping.sourceKey,
            sourceTypeName: mapping.sourceTypeName,
            categoryName,
            categoryId: category.id,
            moviesUpdated: moviesUpdated.count
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        updated: results.length,
        totalMovies: totalMoviesUpdated,
        results,
        dryRun
      }
    });
  } catch (error) {
    console.error('Smart classify error:', error);
    return NextResponse.json(
      { success: false, error: 'Smart classify failed' },
      { status: 500 }
    );
  }
}
