import type { CollectTask } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../prisma';
import { collectPage } from './collector';
import type { CollectTaskMode } from './task-types';

const runningTaskIds = new Set<string>();
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];
const STALE_HEARTBEAT_MS = 5 * 60 * 1_000;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function taskMode(mode: CollectTaskMode) {
  return mode === 'initial-100' ? 'INITIAL_100' : 'FULL';
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 4_000) : '采集失败';
}

async function releaseTaskLease(id: string) {
  await prisma.collectTask.update({
    where: { id },
    data: {
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
}

async function failTask(id: string, error: unknown) {
  const task = await prisma.collectTask.findUnique({ where: { id } });
  if (!task) return;
  if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
    await releaseTaskLease(id);
    return;
  }
  if (task.status !== 'RUNNING') return;

  const failure = await prisma.collectTask.updateMany({
    where: { id, status: 'RUNNING' },
    data: {
      status: 'FAILED',
      errorMessage: errorMessage(error),
      finishedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
  if (failure.count !== 0) return;

  const boundaryTask = await prisma.collectTask.findUnique({ where: { id } });
  if (boundaryTask?.status === 'PAUSED' || boundaryTask?.status === 'CANCELLED') {
    await releaseTaskLease(id);
  }
}

async function collectWithRetry(task: CollectTask, source: { sourceKey: string; apiUrl: string; format: 'JSON' | 'XML' }) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await collectPage({
        sourceKey: source.sourceKey,
        apiUrl: source.apiUrl,
        format: source.format,
        page: task.nextPage,
      });
    } catch (error) {
      lastError = error;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) await sleep(delay);
    }
  }

  throw lastError;
}

export async function runTask(id: string): Promise<void> {
  if (runningTaskIds.has(id)) return;
  runningTaskIds.add(id);

  try {
    const claimedTask = await prisma.collectTask.findUnique({ where: { id } });
    if (!claimedTask || claimedTask.status !== 'RUNNING') return;

    const source = await prisma.collectSource.findUnique({ where: { sourceKey: claimedTask.sourceKey } });
    if (!source || !source.isActive) {
      await failTask(id, new Error('采集源不存在或已被禁用'));
      return;
    }

    while (true) {
      // Mutations are cooperative: the persisted status is authoritative at each page boundary.
      const task = await prisma.collectTask.findUnique({ where: { id } });
      if (!task) return;
      if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
        await releaseTaskLease(id);
        return;
      }
      if (task.status !== 'RUNNING') return;

      let result;
      try {
        result = await collectWithRetry(task, source);
      } catch (error) {
        await failTask(id, error);
        return;
      }

      const now = new Date();
      const nextPage = task.nextPage + 1;
      const fetched = task.fetched + result.fetched;
      const saved = task.saved + result.saved;
      const totalPages = result.pageCount;

      await prisma.collectTask.update({
        where: { id },
        data: {
          currentPage: task.nextPage,
          nextPage,
          totalPages,
          pagesProcessed: task.pagesProcessed + 1,
          fetched,
          saved,
          heartbeatAt: now,
          leaseExpiresAt: new Date(now.getTime() + STALE_HEARTBEAT_MS),
        },
      });

      const checkpointedTask = await prisma.collectTask.findUnique({ where: { id } });
      if (!checkpointedTask) return;
      if (checkpointedTask.status === 'PAUSED' || checkpointedTask.status === 'CANCELLED') {
        await releaseTaskLease(id);
        return;
      }
      if (checkpointedTask.status !== 'RUNNING') return;

      if (
        checkpointedTask.nextPage > checkpointedTask.totalPages ||
        (checkpointedTask.targetRecords !== null && checkpointedTask.saved >= checkpointedTask.targetRecords)
      ) {
        const completion = await prisma.collectTask.updateMany({
          where: { id, status: 'RUNNING' },
          data: {
            status: 'SUCCEEDED',
            finishedAt: new Date(),
            leaseToken: null,
            leaseExpiresAt: null,
          },
        });
        if (completion.count === 1) {
          await prisma.collectSource.update({ where: { sourceKey: task.sourceKey }, data: { lastSync: new Date() } });
        }
        return;
      }
    }
  } finally {
    runningTaskIds.delete(id);
  }
}

async function claimQueuedTask(id: string, sourceKey: string) {
  const leaseToken = uuidv4();
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const activeSourceTask = await transaction.collectTask.findFirst({
      where: { sourceKey, status: 'RUNNING' },
      select: { id: true },
    });
    if (activeSourceTask) return false;

    const claim = await transaction.collectTask.updateMany({
      where: { id, sourceKey, status: 'QUEUED' },
      data: {
        status: 'RUNNING',
        startedAt: now,
        heartbeatAt: now,
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + STALE_HEARTBEAT_MS),
      },
    });
    return claim.count === 1;
  }, { isolationLevel: 'Serializable' });
}

export function dispatchQueuedTasks(): void {
  void (async () => {
    const queuedTasks = await prisma.collectTask.findMany({
      where: { status: 'QUEUED' },
      orderBy: { createdAt: 'asc' },
    });

    for (const task of queuedTasks) {
      if (runningTaskIds.has(task.id)) continue;
      if (await claimQueuedTask(task.id, task.sourceKey)) void runTask(task.id);
    }
  })().catch((error) => console.error('[Collector] Failed to dispatch queued tasks:', error));
}

export async function createCollectionTask(sourceKey: string, mode: CollectTaskMode): Promise<CollectTask> {
  return prisma.collectTask.create({
    data: {
      id: uuidv4(),
      sourceKey,
      mode: taskMode(mode),
      status: 'QUEUED',
      targetRecords: mode === 'initial-100' ? 100 : null,
    },
  });
}

export async function recoverCollectionTasks(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_HEARTBEAT_MS);
  await prisma.collectTask.updateMany({
    where: {
      status: 'RUNNING',
      OR: [{ heartbeatAt: { lt: staleBefore } }, { heartbeatAt: null }],
    },
    data: {
      status: 'QUEUED',
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
  dispatchQueuedTasks();
}

export async function mutateCollectionTask(id: string, action: 'pause' | 'resume' | 'cancel') {
  if (action === 'pause') {
    await prisma.collectTask.updateMany({
      where: { id, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
  } else if (action === 'resume') {
    await prisma.collectTask.updateMany({
      where: { id, status: 'PAUSED' },
      data: { status: 'QUEUED', pausedAt: null, leaseToken: null, leaseExpiresAt: null },
    });
    dispatchQueuedTasks();
  } else {
    await prisma.collectTask.updateMany({
      where: { id, status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] } },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
  }

  return prisma.collectTask.findUnique({ where: { id } });
}
