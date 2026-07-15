import 'dotenv/config';
import prisma from '../src/lib/prisma';

// 从 category.ts 复制同义词表（必须与 src/lib/collector/category.ts 保持一致）
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

async function fixPendingMappings() {
  console.log('🚀 开始修复 PENDING_REVIEW 映射...\n');

  // 1. 查询所有 PENDING_REVIEW
  const pending = await prisma.categoryMapping.findMany({
    where: { status: 'PENDING_REVIEW' },
    select: {
      id: true,
      sourceKey: true,
      sourceTypeName: true,
      localCategoryId: true,
      status: true,
    }
  });

  console.log(`✅ 找到 ${pending.length} 条待修正映射\n`);

  // 2. 预加载所有本地分类
  const allCategories = await prisma.category.findMany({
    select: { id: true, name: true }
  });
  const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
  
  console.log(`📚 本地分类表（${allCategories.length} 个分类）:`);
  allCategories.sort((a, b) => a.id - b.id).forEach(c => {
    console.log(`   - id=${c.id}: ${c.name}`);
  });
  console.log('');

  // 3. 逐条重新匹配
  const success = { count: 0, mappings: [] as any[] };
  const failed = { count: 0, mappings: [] as any[] };

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
      const categoryId = categoryMap.get(categoryName);

      if (categoryId) {
        // 更新映射
        await prisma.categoryMapping.update({
          where: { id: mapping.id },
          data: {
            localCategoryId: categoryId,
            status: 'MAPPED'
          }
        });

        // 更新该 sourceKey + sourceTypeName 的所有影片
        const moviesResult = await prisma.movie.updateMany({
          where: {
            sourceKey: mapping.sourceKey,
            typeName: mapping.sourceTypeName
          },
          data: { typeId: categoryId }
        });

        console.log(`✅ "${mapping.sourceTypeName}" → ${categoryName} (id=${categoryId})`);
        console.log(`   更新了 ${moviesResult.count} 部影片\n`);

        success.count++;
        success.mappings.push({
          from: mapping.sourceTypeName,
          to: categoryName,
          categoryId,
          movieCount: moviesResult.count
        });
      } else {
        console.error(`❌ 未找到本地分类 "${categoryName}"`);
        failed.count++;
        failed.mappings.push(mapping);
      }
    } else {
      console.log(`⚠️  "${mapping.sourceTypeName}" 仍无法匹配，保持 PENDING_REVIEW\n`);
      failed.count++;
      failed.mappings.push(mapping);
    }
  }

  console.log('='.repeat(60));
  console.log('📊 修复结果:');
  console.log(`   成功修正: ${success.count} 个分类`);
  console.log(`   仍需人工处理: ${failed.count} 个分类`);
  
  if (success.mappings.length > 0) {
    console.log('\n✅ 成功修正列表:');
    success.mappings.forEach(m => {
      console.log(`   ${m.from} → ${m.to} (${m.movieCount} 部影片)`);
    });
  }

  if (failed.mappings.length > 0) {
    console.log('\n⚠️  仍需处理:');
    failed.mappings.forEach(m => {
      console.log(`   - ${m.sourceTypeName} (来自 ${m.sourceKey})`);
    });
  }

  // 4. 统计"其他"分类剩余数量
  const otherId = categoryMap.get('其他');
  if (otherId) {
    const remaining = await prisma.movie.count({ where: { typeId: otherId } });
    console.log(`\n📉 "其他"分类剩余影片: ${remaining} 部`);
  }
}

fixPendingMappings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  });
