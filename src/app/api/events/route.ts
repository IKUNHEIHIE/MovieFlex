import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth/auth';
import { queueEvent } from '@/lib/outbox';
import { validateString, validateInteger, validateObject, handleValidationError, ValidationError } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 16_384) {
      return NextResponse.json(
        { success: false, error: '事件数据过大' },
        { status: 413 }
      );
    }

    const body = await request.json();
    
    // 使用验证函数验证字段
    const eventType = validateString(body.eventType, {
      required: true,
      pattern: /^(play_start|play_progress|play_end|view)$/,
    });
    
    const movieId = validateInteger(body.movieId, {
      required: true,
      min: 1,
    });
    
    const data = validateObject(body.data, {
      maxSize: 8192,
    }) || {};

    // 验证播放进度相关字段
    const progressPercent = validateInteger((data as any).progress, {
      min: 0,
      max: 100,
    });
    
    const watchDuration = validateInteger((data as any).currentTime, {
      min: 0,
    });
    
    const totalDuration = validateInteger((data as any).duration, {
      min: 0,
    });

    const episode = validateString((data as any).episode, {
      maxLength: 100,
    }) || '正片';

    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
    if (!movie) return NextResponse.json({ success: false, error: '影片不存在' }, { status: 404 });

    // 1. 尝试获取登录会话
    const session = await auth();
    const userId = Number(session?.user?.id) || -1;

    const watchDurationNum = watchDuration ?? 0;
    const totalDurationNum = totalDuration ?? 0;
    const progressPercentNum = progressPercent ?? 0;

    // 2. 如果是播放事件，且用户已登录，同步记录到 MySQL 数据库中以维护历史进度
    if (userId > 0) {
      try {
        const existingHistory = await prisma.watchHistory.findUnique({ 
          where: { uk_user_movie_ep: { userId, movieId: movieId!, episode } }, 
          select: { id: true } 
        });
        await prisma.watchHistory.upsert({
          where: {
            uk_user_movie_ep: {
              userId,
              movieId: movieId!,
              episode,
            },
          },
          create: {
            userId,
            movieId: movieId!,
            episode,
            watchDuration: watchDurationNum,
            totalDuration: totalDurationNum,
            progress: progressPercentNum,
            lastWatchedAt: new Date(),
          },
          update: {
            watchDuration: watchDurationNum,
            totalDuration: totalDurationNum,
            progress: progressPercentNum,
            lastWatchedAt: new Date(),
          },
        });
        if (eventType === 'play_start' && !existingHistory) {
          await prisma.movie.update({ where: { id: movieId! }, data: { viewCount: { increment: 1 } } });
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
      data: data as any,
      client_info: {
        user_agent: userAgent,
        page_url: referer,
      },
    };

    const delivered = await queueEvent('user-behaviors', behaviorEvent);

    return NextResponse.json({ success: true, kafkaDelivered: delivered });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      return handleValidationError(error);
    }
    console.error('Event tracking endpoint error:', error);
    return NextResponse.json({ success: false, error: '事件处理失败' }, { status: 500 });
  }
}
