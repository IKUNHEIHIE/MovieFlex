#!/usr/bin/env npx tsx
/**
 * MovieFlex 开发环境种子数据脚本
 * 运行: npx tsx scripts/seed.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedDefaultCategories } from './init-categories';

const prisma = new PrismaClient();

const SAMPLE_MOVIES = [
  // === 电影 ===
  { vodId: 1, sourceKey: 'default', title: '速度与激情10', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie1/300/450', director: '路易斯·莱特里尔', area: '美国', language: '英语', year: 2023, score: 8.2, viewCount: 15800, remarks: 'HD', description: '当家人们陷入危机，唐老大（范·迪塞尔 饰）为救飞车家族再度出山，与塞弗展开惊天大战。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 2, sourceKey: 'default', title: '流浪地球2', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie2/300/450', director: '郭帆', area: '中国', language: '国语', year: 2023, score: 8.8, viewCount: 22500, remarks: 'HD', description: '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。面对未知的挑战，一场关乎人类命运的战斗即将打响。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 3, sourceKey: 'default', title: '奥本海默', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie3/300/450', director: '克里斯托弗·诺兰', area: '美国', language: '英语', year: 2023, score: 9.0, viewCount: 19200, remarks: 'HD', description: '讲述了美国“原子弹之父”罗伯特·奥本海默的故事，他领导曼哈顿计划开发了原子弹，随后深陷道德困境。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 4, sourceKey: 'default', title: '蜘蛛侠：纵横宇宙', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie4/300/450', director: '乔伊姆·多斯·桑托斯', area: '美国', language: '英语', year: 2023, score: 9.2, viewCount: 18600, remarks: 'HD', description: '迈尔斯·莫拉莱斯踏上穿越多元宇宙的冒险，与蜘蛛侠联盟一起对抗新的威胁。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 5, sourceKey: 'default', title: '封神第一部', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie5/300/450', director: '乌尔善', area: '中国', language: '国语', year: 2023, score: 8.5, viewCount: 21000, remarks: 'HD', description: '三千多年前，商王殷寿残暴无道，姬发觉醒成为天下共主的故事。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 6, sourceKey: 'default', title: '满江红', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie6/300/450', director: '张艺谋', area: '中国', language: '国语', year: 2023, score: 8.4, viewCount: 19800, remarks: 'HD', description: '南宋年间，一群小人物在危机中挺身而出，用生命书写了一段可歌可泣的故事。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 7, sourceKey: 'default', title: '碟中谍7', typeId: 1, typeName: '电影片', picUrl: 'https://picsum.photos/seed/movie7/300/450', director: '克里斯托弗·麦奎里', area: '美国', language: '英语', year: 2023, score: 8.3, viewCount: 17200, remarks: 'HD', description: '伊森·亨特和他的 IMF 团队再次集结，面对迄今为止最危险的对手和前所未有的挑战。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  // === 动画 ===
  { vodId: 8, sourceKey: 'default', title: '鬼灭之刃 刀匠村篇', typeId: 5, typeName: '动漫片', picUrl: 'https://picsum.photos/seed/anime1/300/450', director: '外崎春雄', area: '日本', language: '日语', year: 2023, score: 9.1, viewCount: 32400, remarks: '更新至11集', description: '炭治郎一行人来到刀匠村，遭遇了新的上弦之鬼的袭击。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 9, sourceKey: 'default', title: '咒术回战 第二季', typeId: 5, typeName: '动漫片', picUrl: 'https://picsum.photos/seed/anime2/300/450', director: '御所园翔太', area: '日本', language: '日语', year: 2023, score: 9.3, viewCount: 35600, remarks: '更新至23集', description: '虎杖悠仁与同伴们继续与咒灵作战，五条悟的过去被揭开。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 10, sourceKey: 'default', title: '海贼王', typeId: 5, typeName: '动漫片', picUrl: 'https://picsum.photos/seed/anime3/300/450', director: '尾田荣一郎', area: '日本', language: '日语', year: 1999, score: 9.5, viewCount: 128000, remarks: '更新至1089集', description: '路飞带领草帽海贼团踏上寻找 ONE PIECE 的伟大冒险。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  // === 剧集 ===
  { vodId: 11, sourceKey: 'default', title: '狂飙', typeId: 2, typeName: '连续剧', picUrl: 'https://picsum.photos/seed/tv1/300/450', director: '徐纪周', area: '中国', language: '国语', year: 2023, score: 9.4, viewCount: 45200, remarks: '共39集', description: '讲述了以一线刑警安欣为代表的正义力量与黑恶势力长达二十年的生死搏斗。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 12, sourceKey: 'default', title: '三体', typeId: 2, typeName: '连续剧', picUrl: 'https://picsum.photos/seed/tv2/300/450', director: '杨磊', area: '中国', language: '国语', year: 2023, score: 8.8, viewCount: 38500, remarks: '共30集', description: '纳米科学家汪淼被警官史强带到联合作战中心，一个名叫"科学边界"的组织进入了他的视野。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 13, sourceKey: 'default', title: '漫长的季节', typeId: 2, typeName: '连续剧', picUrl: 'https://picsum.photos/seed/tv3/300/450', director: '辛爽', area: '中国', language: '国语', year: 2023, score: 9.5, viewCount: 29800, remarks: '共12集', description: '小城桦林发生一桩碎尸案，出租车司机王响和妹夫龚彪联手调查。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  // === 综艺 ===
  { vodId: 14, sourceKey: 'default', title: '奔跑吧 第七季', typeId: 7, typeName: '综艺片', picUrl: 'https://picsum.photos/seed/show1/300/450', director: '浙江卫视', area: '中国', language: '国语', year: 2023, score: 7.8, viewCount: 25600, remarks: '更新至12期', description: '大型户外竞技真人秀节目。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { vodId: 15, sourceKey: 'default', title: '向往的生活 第七季', typeId: 7, typeName: '综艺片', picUrl: 'https://picsum.photos/seed/show2/300/450', director: '湖南卫视', area: '中国', language: '国语', year: 2023, score: 8.1, viewCount: 22400, remarks: '更新至14期', description: '田园慢生活真人秀。', playFrom: '默认播放器', playUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
];

async function main() {
  console.log('🌱 MovieFlex 种子数据初始化...\n');

  // 1. 初始化分类
  console.log('📁 初始化分类...');
  await seedDefaultCategories();
  console.log('✅ 分类初始化完成\n');

  // 2. 创建默认采集源
  console.log('📡 创建默认采集源...');
  const existingSource = await prisma.collectSource.findUnique({
    where: { sourceKey: 'default' }
  });
  if (!existingSource) {
    await prisma.collectSource.create({
      data: {
        name: '默认采集源',
        apiUrl: 'https://example.com/api',
        sourceKey: 'default',
        format: 'JSON',
        isActive: true,
      }
    });
    console.log('✅ 默认采集源已创建');
  } else {
    console.log('⏭️  默认采集源已存在，跳过');
  }
  console.log();

  // 3. 插入示例影片
  console.log('🎬 插入示例影片...');
  let inserted = 0;
  for (const movie of SAMPLE_MOVIES) {
    const existing = await prisma.movie.findFirst({
      where: { sourceKey: movie.sourceKey, vodId: movie.vodId }
    });
    if (!existing) {
      await prisma.movie.create({
        data: {
          ...movie,
          score: movie.score as any,
          sourceTime: new Date(),
        }
      });
      inserted++;
    }
  }
  console.log(`✅ 新增 ${inserted} 部影片（已存在 ${SAMPLE_MOVIES.length - inserted} 部跳过）\n`);

  // 4. 创建系统设置
  console.log('⚙️  创建系统设置...');
  const settings = [
    { key: 'site_name', value: 'MovieFlex' },
    { key: 'site_description', value: '海量影视资源，智能推荐' },
    { key: 'active_theme', value: 'ice-blue' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ 系统设置已创建\n');

  // 5. 创建内置主题
  console.log('🎨 创建内置主题...');
  const existingTheme = await prisma.theme.findUnique({
    where: { themeKey: 'ice-blue' }
  });
  if (!existingTheme) {
    await prisma.theme.create({
      data: {
        name: '冰蓝主题',
        themeKey: 'ice-blue',
        author: 'MovieFlex',
        version: '1.0.0',
        description: '默认冰蓝色主题',
        isBuiltIn: true,
      }
    });
    console.log('✅ 内置主题已创建');
  } else {
    console.log('⏭️  主题已存在，跳过');
  }
  console.log();

  // 统计
  const movieCount = await prisma.movie.count();
  const categoryCount = await prisma.category.count();
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 最终统计:`);
  console.log(`   分类: ${categoryCount} 个`);
  console.log(`   影片: ${movieCount} 部`);
  console.log(`   采集源: ${existingSource ? 1 : 0} 个`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 种子数据初始化完成！');
  console.log('💡 重启开发服务器后刷新页面即可看到效果');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ 种子数据初始化失败:', e);
  process.exit(1);
});
