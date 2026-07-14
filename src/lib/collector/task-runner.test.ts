import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { prisma, collectPage } = vi.hoisted(() => {
  const prisma = {
    collectTask: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    collectSource: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prisma, collectPage: vi.fn() };
});

vi.mock('../prisma', () => ({ default: prisma }));
vi.mock('./collector', () => ({ collectPage }));

import { recoverCollectionTasks, runTask } from './task-runner';

const source = {
  sourceKey: 'qz',
  apiUrl: 'https://api.example/provide/vod',
  format: 'JSON',
  isActive: true,
};

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    sourceKey: 'qz',
    mode: 'FULL',
    status: 'RUNNING',
    targetRecords: null,
    totalPages: 0,
    pagesProcessed: 0,
    nextPage: 1,
    currentPage: 0,
    fetched: 0,
    saved: 0,
    leaseToken: 'lease-1',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation(async (callback: (client: typeof prisma) => unknown) => callback(prisma));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('checkpoints nextPage and totals after every successful page', async () => {
  prisma.collectTask.findUnique
    .mockResolvedValueOnce(task())
    .mockResolvedValueOnce(task());
  prisma.collectSource.findUnique.mockResolvedValue(source);
  collectPage.mockResolvedValue({ fetched: 20, saved: 20, pageCount: 1, warnings: [] });
  prisma.collectTask.update.mockResolvedValue(task());
  prisma.collectSource.update.mockResolvedValue(source);

  await runTask('task-1');

  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ pagesProcessed: 1, nextPage: 2, fetched: 20, saved: 20 }),
  }));
});

it('pauses at a page boundary and resumes from the persisted next page', async () => {
  prisma.collectTask.findUnique
    .mockResolvedValueOnce(task())
    .mockResolvedValueOnce(task())
    .mockResolvedValueOnce(task({ status: 'PAUSED', nextPage: 2, pagesProcessed: 1, fetched: 20, saved: 20 }));
  prisma.collectSource.findUnique.mockResolvedValue(source);
  collectPage.mockResolvedValueOnce({ fetched: 20, saved: 20, pageCount: 2, warnings: [] });
  prisma.collectTask.update.mockResolvedValue(task({ status: 'PAUSED', nextPage: 2 }));

  await runTask('task-1');

  expect(collectPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'PAUSED' }),
  }));

  prisma.collectTask.findUnique
    .mockResolvedValueOnce(task({ nextPage: 2, pagesProcessed: 1, fetched: 20, saved: 20 }))
    .mockResolvedValueOnce(task({ nextPage: 2, pagesProcessed: 1, fetched: 20, saved: 20 }))
    .mockResolvedValueOnce(task({ nextPage: 3, pagesProcessed: 2, fetched: 40, saved: 40 }));
  collectPage.mockResolvedValueOnce({ fetched: 20, saved: 20, pageCount: 2, warnings: [] });
  prisma.collectTask.update.mockResolvedValue(task({ status: 'SUCCEEDED', nextPage: 3 }));
  prisma.collectTask.updateMany.mockResolvedValue({ count: 1 });
  prisma.collectSource.update.mockResolvedValue(source);

  await runTask('task-1');

  expect(collectPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
});

it('honors a pause submitted while the final page is being collected', async () => {
  prisma.collectTask.findUnique
    .mockResolvedValueOnce(task())
    .mockResolvedValueOnce(task())
    .mockResolvedValueOnce(task({ status: 'PAUSED', nextPage: 2, pagesProcessed: 1, fetched: 20, saved: 20 }));
  prisma.collectSource.findUnique.mockResolvedValue(source);
  collectPage.mockResolvedValue({ fetched: 20, saved: 20, pageCount: 1, warnings: [] });
  prisma.collectTask.update.mockResolvedValue(task({ status: 'PAUSED', nextPage: 2 }));

  await runTask('task-1');

  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'PAUSED' }),
  }));
  expect(prisma.collectSource.update).not.toHaveBeenCalled();
});

it('marks a stale running task queued during recovery', async () => {
  prisma.collectTask.updateMany.mockResolvedValue({ count: 1 });

  await recoverCollectionTasks();

  expect(prisma.collectTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'QUEUED' }),
  }));
});

it('succeeds an initial task after its saved target is reached', async () => {
  prisma.collectTask.findUnique
    .mockResolvedValueOnce(task({ mode: 'INITIAL_100', targetRecords: 100, saved: 90 }))
    .mockResolvedValueOnce(task({ mode: 'INITIAL_100', targetRecords: 100, saved: 90 }))
    .mockResolvedValueOnce(task({ mode: 'INITIAL_100', targetRecords: 100, saved: 100, nextPage: 2, pagesProcessed: 1 }));
  prisma.collectSource.findUnique.mockResolvedValue(source);
  collectPage.mockResolvedValue({ fetched: 20, saved: 10, pageCount: 50, warnings: [] });
  prisma.collectTask.update.mockResolvedValue(task({ status: 'SUCCEEDED', saved: 100 }));
  prisma.collectTask.updateMany.mockResolvedValue({ count: 1 });
  prisma.collectSource.update.mockResolvedValue(source);

  await runTask('task-1');

  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ saved: 100 }),
  }));
  expect(prisma.collectTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'SUCCEEDED' }),
  }));
  expect(prisma.collectSource.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ lastSync: expect.any(Date) }),
  }));
});
