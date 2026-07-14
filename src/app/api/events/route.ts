import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { queueEvent } from '@/lib/outbox';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 16_384) return NextResponse.json({ success: false, error: '事件数据过大' }, { status: 413 });
    const { eventType, movieId, data = {} } = await request.json();

    if (!['play_start', 'play_progress', 'play_end'].includes(eventType) || !Number.isSafeInteger(movieId) || movieId < 1 || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: '事件参数无效' }, { status: 400 });
    }
    if (JSON.stringify(data).length > 8_192) return NextResponse.json({ success: false, error: '事件详情过大' }, { status: 413 });
    const episode = typeof data.episode === 'string' ? data.episode.slice(0, 100) : '正片';
    const watchDuration = Number(data.currentTime);
    const totalDuration = Number(data.duration);
    const progressPercent = Number(data.progress);
    if (![watchDuration, totalDuration, progressPercent].every(Number.isFinite) || watchDuration < 0 || totalDuration < 0 || watchDuration > totalDuration || progressPercent < 0 || progressPercent > 100) {
      return NextResponse.json({ success: false, error: '播放进度无效' }, { status: 400 });
    }
    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
    if (!movie) return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });

    // 1. 尝试获取登录会话
    const session = await auth();
    const userId = Number(session?.user?.id) || -1;

    // 2. 如果是播放事件，且用户已登录，同步记录到 MySQL 数据库中以维护历史进度
    if (userId > 0) {
      try {
        const existingHistory = await prisma.watchHistory.findUnique({ where: { uk_user_movie_ep: { userId, movieId, episode } }, select: { id: true } });
        await prisma.watchHistory.upsert({
          where: {
            uk_user_movie_ep: {
              userId,
              movieId,
              episode,
            },
          },
          create: {
            userId,
            movieId,
            episode,
            watchDuration,
            totalDuration,
            progress: progressPercent,
            lastWatchedAt: new Date(),
          },
          update: {
            watchDuration,
            totalDuration,
            progress: progressPercent,
            lastWatchedAt: new Date(),
          },
        });
        if (eventType === 'play_start' && !existingHistory) {
          await prisma.movie.update({ where: { id: movieId }, data: { viewCount: { increment: 1 } } });
        }
      } catch (dbErr) {
        console.error('Failed to save watch history to DB:', dbErr);
      }
    }

    // 3. 构建标准的大数据分析事件数据包，并推入 Kafka
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'unknown';

    const behaviorEvent = {
      event_id: uuidv4(),
      user_id: userId,
      event_type: eventType,
      movie_id: movieId || null,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
      },
      client_info: {
        user_agent: userAgent,
        page_url: referer,
      },
    };

    const delivered = await queueEvent('user-behaviors', behaviorEvent);

    return NextResponse.json({ success: true, kafkaDelivered: delivered });
  } catch (error: unknown) {
    console.error('Event tracking endpoint error:', error);
    return NextResponse.json({ success: false, error: '事件处理失败' }, { status: 500 });
  }
}
