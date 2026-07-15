'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { PlayerMode } from '@/lib/playback/playback';

interface VideoPlayerProps {
  url: string;
  movieId: number;
  episodeName: string;
  mode: PlayerMode;
}

export default function VideoPlayer({ url, movieId, episodeName, mode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const lastReportedTime = useRef<number>(0);
  const viewEventSent = useRef(false);

  // 发送行为事件给后端 Kafka 事件采集器
  const sendBehaviorEvent = async (eventType: string, extraData: Record<string, unknown> = {}) => {
    try {
      const video = videoRef.current;
      const progress = video ? (video.currentTime / (video.duration || 1)) * 100 : 0;

      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          movieId,
          data: {
            episode: episodeName,
            url,
            currentTime: video ? Math.round(video.currentTime) : 0,
            duration: video ? Math.round(video.duration) : 0,
            progress: progress.toFixed(2),
            playerMode: mode,
            ...extraData
          }
        }),
        keepalive: true // 保证在页面卸载/跳出时请求仍能发出
      });
    } catch (err) {
      // 埋点失败不阻断正常播放
      console.warn('Failed to send tracking event:', err);
    }
  };

  // 页面加载时发送 view 事件（所有播放模式）
  useEffect(() => {
    if (!viewEventSent.current) {
      viewEventSent.current = true;
      sendBehaviorEvent('view');
    }
  }, [movieId, episodeName]);

  // HLS 模式：初始化播放器和详细追踪
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== 'HLS') return;

    let hls: Hls | null = null;
    let networkRecoveries = 0;

    // HLS 播放初始化
    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 30, // 控制最大缓冲区以防内存溢出
        enableWorker: true
      });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRecoveries < 2) {
                networkRecoveries += 1;
                hls?.startLoad();
              } else {
                setError('视频网络连接失败，请更换播放源后重试');
                hls?.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, try to recover...');
              hls?.recoverMediaError();
              break;
            default:
              setError('视频加载失败，请尝试刷新页面或更换播放源');
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 浏览器原生支持 HLS 播放
      video.src = url;
    } else {
      setError('您的浏览器不支持 HLS (m3u8) 视频播放，请更换 Chrome/Edge/Firefox 等现代浏览器。');
    }

    // 播放事件监听
    const handlePlay = () => sendBehaviorEvent('play_start');
    const handlePause = () => sendBehaviorEvent('play_progress', { action: 'pause' });
    const handleEnded = () => sendBehaviorEvent('play_end');
    
    // 定时上报观看进度：每观看 10 秒上报一次
    const handleTimeUpdate = () => {
      if (!video) return;
      const currentTime = video.currentTime;
      if (Math.abs(currentTime - lastReportedTime.current) >= 10) {
        lastReportedTime.current = currentTime;
        sendBehaviorEvent('play_progress', { action: 'heartbeat' });
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (hls) {
        hls.destroy();
      }
      
      // 卸载组件时进行最后一次播放上报
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [url, movieId, episodeName, mode]);

  return (
    <div style={{ position: 'relative', width: '100%', background: '#000', aspectRatio: '16/9', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {error ? (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-danger)',
          background: 'rgba(0,0,0,0.9)',
          padding: '20px',
          textAlign: 'center',
          fontSize: '1rem',
          zIndex: 10
        }}>
          ⚠️ {error}
        </div>
      ) : null}

      {mode === 'HLS' ? <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: '100%', height: '100%' }}
        className="custom-video-player"
      /> : <iframe
        src={url}
        title={`${episodeName} 播放器`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', border: 0 }}
      />}
    </div>
  );
}
