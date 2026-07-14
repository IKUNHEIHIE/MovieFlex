import { describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  default: { collectSource: { create } },
}));

vi.mock('@/lib/auth/authorization', () => ({
  isAuthorizationFailure: () => false,
  requireAdmin: vi.fn().mockResolvedValue({ userId: 1, role: 'ADMIN' }),
}));

vi.mock('@/lib/collector/collection-url', () => ({
  validateCollectionUrl: (value: string) => value,
}));

vi.mock('@/lib/collector/player-config', () => ({
  normalizePlayerConfigs: vi.fn(),
}));

vi.mock('@/lib/collector/source-key', () => ({
  suggestSourceKey: () => 'catalog',
}));

import { POST } from './route';

describe('POST /api/collect/sources', () => {
  it('returns the duplicate-key response without retrying a non-source-key P2002', async () => {
    create
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['apiUrl'] } })
      .mockRejectedValueOnce(new Error('unexpected retry'));

    const response = await POST(new Request('http://localhost/api/collect/sources', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Source',
        apiUrl: 'https://catalog.example/api.php/provide/vod/',
        format: 'JSON',
      }),
    }) as never);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, error: '资源标识 (sourceKey) 已存在' });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
