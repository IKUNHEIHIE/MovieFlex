import { beforeEach, describe, expect, it, vi } from 'vitest';

const { categoryFindUnique, movieCreate, movieAggregate } = vi.hoisted(() => ({
  categoryFindUnique: vi.fn(),
  movieCreate: vi.fn(),
  movieAggregate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    category: { findUnique: categoryFindUnique },
    movie: { aggregate: movieAggregate, create: movieCreate },
  },
}));

vi.mock('@/lib/auth/authorization', () => ({
  isAuthorizationFailure: () => false,
  requireAdmin: vi.fn().mockResolvedValue({ userId: 1, role: 'ADMIN' }),
}));

import { POST } from './route';

describe('POST /api/admin/movies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    movieAggregate.mockResolvedValue({ _max: { vodId: 40 } });
  });

  it('creates a manual movie with the selected category name', async () => {
    categoryFindUnique.mockResolvedValue({ id: 12, name: '香港剧' });
    movieCreate.mockResolvedValue({ id: 99, title: '新影片' });

    const response = await POST(new Request('http://localhost/api/admin/movies', {
      method: 'POST',
      body: JSON.stringify({ title: ' 新影片 ', typeId: '12', year: '2026', score: '8.5' }),
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, data: { id: 99, title: '新影片' } });
    expect(movieCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceKey: 'manual',
        vodId: 41,
        title: '新影片',
        typeId: 12,
        typeName: '香港剧',
        year: 2026,
        score: 8.5,
      }),
    });
  });

  it('rejects a missing category', async () => {
    categoryFindUnique.mockResolvedValue(null);

    const response = await POST(new Request('http://localhost/api/admin/movies', {
      method: 'POST',
      body: JSON.stringify({ title: '新影片', typeId: '999' }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: '请选择有效分类' });
    expect(movieCreate).not.toHaveBeenCalled();
  });
});
