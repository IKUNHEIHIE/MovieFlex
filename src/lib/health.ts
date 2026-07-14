import prisma from './prisma';
import { getKafkaProducer } from './kafka';

export type HealthStatus = 'ok' | 'degraded' | 'failed';

export interface HealthData {
  database: {
    status: HealthStatus;
    latency: number;
  };
  kafka: {
    status: HealthStatus;
    connected: boolean;
  };
  metrics: {
    movieCount: number;
    pendingEvents: number;
    latestTask: {
      status: string | null;
      createdAt: string | null;
    };
    latestRecommendation: {
      batchId: string | null;
      createdAt: string | null;
    };
  };
  timestamp: string;
}

let cachedHealth: { data: HealthData; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000;

export async function getHealthStatus(): Promise<HealthData> {
  const now = Date.now();
  
  if (cachedHealth && now - cachedHealth.timestamp < CACHE_TTL_MS) {
    return cachedHealth.data;
  }

  const startTime = Date.now();
  
  const [dbResult, kafkaResult, metrics] = await Promise.all([
    checkDatabase(),
    checkKafka(),
    getMetrics(),
  ]);

  const healthData: HealthData = {
    database: {
      status: dbResult.status,
      latency: Date.now() - startTime,
    },
    kafka: {
      status: kafkaResult.status,
      connected: kafkaResult.connected,
    },
    metrics,
    timestamp: new Date().toISOString(),
  };

  cachedHealth = { data: healthData, timestamp: now };
  return healthData;
}

async function checkDatabase(): Promise<{ status: HealthStatus }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'failed' };
  }
}

async function checkKafka(): Promise<{ status: HealthStatus; connected: boolean }> {
  try {
    const producer = await getKafkaProducer();
    const connected = producer !== null;
    return {
      status: connected ? 'ok' : 'degraded',
      connected,
    };
  } catch (error) {
    console.error('Kafka health check failed:', error);
    return { status: 'degraded', connected: false };
  }
}

async function getMetrics() {
  const [movieCount, pendingEvents, latestTask, latestRecommendation] = await Promise.all([
    prisma.movie.count(),
    prisma.eventOutbox.count({ where: { status: 'PENDING' } }),
    prisma.collectTask.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { status: true, createdAt: true },
    }),
    prisma.recommendation.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { batchId: true, createdAt: true },
    }),
  ]);

  return {
    movieCount,
    pendingEvents,
    latestTask: {
      status: latestTask?.status || null,
      createdAt: latestTask?.createdAt?.toISOString() || null,
    },
    latestRecommendation: {
      batchId: latestRecommendation?.batchId || null,
      createdAt: latestRecommendation?.createdAt?.toISOString() || null,
    },
  };
}
