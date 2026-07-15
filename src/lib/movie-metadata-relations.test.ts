import { describe, expect, it, vi } from 'vitest';
import { replaceMovieMetadataRelations } from './movie-metadata-relations';

describe('replaceMovieMetadataRelations', () => {
  it('replaces relations with every distinct area and language from source metadata', async () => {
    const prisma = {
      movieArea: { deleteMany: vi.fn(), createMany: vi.fn() },
      movieLanguage: { deleteMany: vi.fn(), createMany: vi.fn() },
    };

    await replaceMovieMetadataRelations(prisma as never, 9, '中国大陆 / 中国香港', '粤语,汉语普通话');

    expect(prisma.movieArea.createMany).toHaveBeenCalledWith({
      data: [{ movieId: 9, area: '中国大陆' }, { movieId: 9, area: '中国香港' }],
    });
    expect(prisma.movieLanguage.createMany).toHaveBeenCalledWith({
      data: [{ movieId: 9, language: '粤语' }, { movieId: 9, language: '汉语普通话' }],
    });
  });
});
