import { beforeEach, describe, expect, it, vi } from 'vitest';

const { categoryFindUnique, movieFindUnique, movieUpdate, movieDelete } = vi.hoisted(() => ({
  categoryFindUnique: vi.fn(),
  movieFindUnique: vi.fn(),
  movieUpdate: vi.fn(),
  movieDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    category: { findUnique: categoryFindUnique },
    movie: { findUnique: movieFindUnique, update: movieUpdate, delete: movieDelete },
  },
}));

vi.mock('@/lib/auth/authorization', () => ({
  isAuthorizationFailure: () => false,
  requireAdmin: vi.fn().mockResolvedValue({ userId: 1, role: 'ADMIN' }),
}));

import { DELETE, PUT } from './route';

describe('/api/admin/movies/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates editable movie fields and refreshes typeName from category', async () => {
    categoryFindUnique.mockResolvedValue({ id: 14, name: '韩国剧' });
    movieUpdate.mockResolvedValue({ id: 7, title: '更新后' });

    const response = await PUT(new Request('http://localhost/api/admin/movies/7', {
      method: 'PUT',
      body: JSON.stringify({ title: ' 更新后 ', typeId: '14', score: '9.1' }),
    }), { params: Promise.resolve({ id: '7' }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { id: 7, title: '更新后' } });
    expect(movieUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ title: '更新后', typeId: 14, typeName: '韩国剧', score: 9.1 }),
    });
  });

  it('rejects invalid movie ids before deleting', async () => {
    const response = await DELETE(new Request('http://localhost/api/admin/movies/nope', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'nope' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: '影片参数无效' });
    expect(movieDelete).not.toHaveBeenCalled();
  });
});
