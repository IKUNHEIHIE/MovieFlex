import { describe, expect, it, vi } from 'vitest';

vi.mock('./prisma', () => ({ default: {} }));
vi.mock('./kafka', () => ({ getKafkaProducer: vi.fn() }));

import { measureDatabaseHealth } from './health';

describe('measureDatabaseHealth', () => {
  it('reports only the database probe duration', async () => {
    const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_012);

    await expect(measureDatabaseHealth(async () => undefined, now)).resolves.toEqual({
      status: 'ok',
      latency: 12,
    });
  });

  it('reports the probe duration when the database probe fails', async () => {
    const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_027);

    await expect(measureDatabaseHealth(async () => {
      throw new Error('connection lost');
    }, now)).resolves.toEqual({
      status: 'failed',
      latency: 27,
    });
  });
});
