import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/health';

export async function GET() {
  try {
    const health = await getHealthStatus();
    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        database: { status: 'failed', latency: 0 },
        kafka: { status: 'failed', connected: false },
        metrics: {
          movieCount: 0,
          pendingEvents: 0,
          latestTask: { status: null, createdAt: null },
          latestRecommendation: { batchId: null, createdAt: null },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
