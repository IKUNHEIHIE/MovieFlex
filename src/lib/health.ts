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

export interface HealthHistoryPoint {
  timestamp: string;
  dbLatency: number;
  pendingEvents: number;
  movieCount: number;
}

let cachedHealth: { data: HealthData; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000;

// In-memory history storage (last 1 hour, 1 point per 10 seconds = 360 points max)
const healthHistory: HealthHistoryPoint[] = [];
const HISTORY_MAX_POINTS = 360;
const HISTORY_INTERVAL_MS = 10000; // 10 seconds
let lastHistoryUpdate = 0;

function addHistoryPoint(data: HealthData) {
  const now = Date.now();
  if (now - lastHistoryUpdate < HISTORY_INTERVAL_MS) {
    return;
  }
  lastHistoryUpdate = now;

  healthHistory.push({
    timestamp: data.timestamp,
    dbLatency: data.database.latency,
    pendingEvents: data.metrics.pendingEvents,
    movieCount: data.metrics.movieCount,
  });

  if (healthHistory.length > HISTORY_MAX_POINTS) {
    healthHistory.shift();
  }
}

export function getHealthHistory(): HealthHistoryPoint[] {
  return [...healthHistory];
}

export async function getHealthStatus(): Promise<HealthData> {
  const now = Date.now();
  
  if (cachedHealth && now - cachedHealth.timestamp < CACHE_TTL_MS) {
    return cachedHealth.data;
  }

  const [dbResult, kafkaResult, metrics] = await Promise.all([
    checkDatabase(),
    checkKafka(),
    getMetrics(),
  ]);

  const healthData: HealthData = {
    database: {
      status: dbResult.status,
      latency: dbResult.latency,
    },
    kafka: {
      status: kafkaResult.status,
      connected: kafkaResult.connected,
    },
    metrics,
    timestamp: new Date().toISOString(),
  };

  cachedHealth = { data: healthData, timestamp: now };
  addHistoryPoint(healthData);
  return healthData;
}

export async function measureDatabaseHealth(
  probe: () => Promise<unknown>,
  now: () => number = Date.now,
): Promise<{ status: HealthStatus; latency: number }> {
  const start = now();
  try {
    await probe();
    return { status: 'ok', latency: now() - start };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'failed', latency: now() - start };
  }
}

async function checkDatabase() {
  return measureDatabaseHealth(() => prisma.$queryRaw`SELECT 1`);
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
