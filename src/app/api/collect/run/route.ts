import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { collector } from '@/lib/collector';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 });
    }

    const { sourceKey, mode = 'recent', hours = 24 } = await request.json();
    if (typeof sourceKey !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(sourceKey) || !['recent', 'full'].includes(mode) || !Number.isSafeInteger(hours) || hours < 1 || hours > 168) {
      return NextResponse.json({ success: false, error: '采集参数无效' }, { status: 400 });
    }

    const source = await prisma.collectSource.findUnique({
      where: { sourceKey },
    });

    if (!source || !source.isActive) {
      return NextResponse.json({ success: false, error: '采集源不存在或已被禁用' }, { status: 404 });
    }
    const runningTask = await prisma.collectTask.findFirst({ where: { sourceKey, status: 'RUNNING' }, select: { id: true } });
    if (runningTask) return NextResponse.json({ success: false, error: '该采集源已有运行中的任务' }, { status: 409 });
    const task = await prisma.collectTask.create({ data: { id: uuidv4(), sourceKey, mode, status: 'RUNNING' } });

    const params: Record<string, string | number> = {
      ac: 'detail',
      pg: 1,
    };

    if (mode === 'recent') {
      params.h = hours;
    }

    try {
    // 1. 采集第一页，获取 pageCount
    console.log(`[Collector] Starting page 1 for source ${source.name} (${sourceKey})...`);
    const firstPageResult = await collector.runCollect(
      source.sourceKey,
      source.apiUrl,
      source.format === 'XML' ? 'XML' : 'JSON',
      params
    );

    let totalFetched = firstPageResult.fetched;
    let totalSaved = firstPageResult.saved;
    const allWarnings = [...firstPageResult.warnings];
    const totalPages = firstPageResult.pageCount;

    console.log(`[Collector] Page 1 complete. Total pages: ${totalPages}.`);

    // 2. 循环采集剩余页数 (为防止 HTTP 请求超时，如果是全量采集，可设置最大页数限制，此处设为最大拉取 50 页作为测试/演示限制)
    const maxPages = mode === 'full' ? 50 : 20;
    const endPage = Math.min(totalPages, maxPages);

    for (let page = 2; page <= endPage; page++) {
      try {
        console.log(`[Collector] Fetching page ${page}/${totalPages}...`);
        params.pg = page;
        
        // 限频休眠 500ms
        await new Promise((resolve) => setTimeout(resolve, 500));

        const pageResult = await collector.runCollect(
          source.sourceKey,
          source.apiUrl,
          source.format === 'XML' ? 'XML' : 'JSON',
          params
        );

        totalFetched += pageResult.fetched;
        totalSaved += pageResult.saved;
        
        // 合并警告
        pageResult.warnings.forEach((warn) => {
          if (!allWarnings.some((w) => w.sourceTypeId === warn.sourceTypeId)) {
            allWarnings.push(warn);
          }
        });
      } catch (err: unknown) {
        console.error(`[Collector] Error on page ${page}:`, err instanceof Error ? err.message : err);
      }
    }

    // 3. 更新最后同步时间
    await prisma.collectSource.update({
      where: { sourceKey },
      data: { lastSync: new Date() },
    });

    await prisma.collectTask.update({ where: { id: task.id }, data: { status: 'SUCCEEDED', totalPages, pagesProcessed: endPage, fetched: totalFetched, saved: totalSaved, finishedAt: new Date() } });
    return NextResponse.json({
      success: true,
      data: {
        sourceName: source.name,
        mode,
        totalPages,
        pagesProcessed: endPage,
        fetched: totalFetched,
        saved: totalSaved,
        warnings: allWarnings,
      },
    });
    } catch (error: unknown) {
      await prisma.collectTask.update({ where: { id: task.id }, data: { status: 'FAILED', errorMessage: error instanceof Error ? error.message.slice(0, 4000) : '采集失败', finishedAt: new Date() } });
      throw error;
    }
  } catch (error: unknown) {
    console.error('[Collector] Run Error:', error);
    return NextResponse.json({ success: false, error: '采集任务失败' }, { status: 500 });
  }
}
