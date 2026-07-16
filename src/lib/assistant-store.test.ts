import { describe, expect, it, vi } from 'vitest';
import { createConversationTitle, toStoredImageMetadata } from './assistant-store';

vi.mock('./prisma', () => ({
  default: {},
}));

describe('assistant store helpers', () => {
  it('creates stable short conversation titles', () => {
    expect(createConversationTitle('  推荐 一部 科幻电影  ')).toBe('推荐 一部 科幻电影');
    expect(createConversationTitle('')).toBe('新的 AI 对话');
    expect(createConversationTitle('一'.repeat(40))).toBe(`${'一'.repeat(32)}...`);
  });

  it('keeps image metadata without storing image bytes', () => {
    expect(toStoredImageMetadata({ imageFileName: 'poster.png', imageMimeType: 'image/png', imageSize: 2048 })).toEqual({
      hasImage: true,
      imageFileName: 'poster.png',
      imageMimeType: 'image/png',
      imageSize: 2048,
    });
    expect(toStoredImageMetadata({ imageFileName: null, imageMimeType: null, imageSize: null })).toEqual({
      hasImage: false,
      imageFileName: null,
      imageMimeType: null,
      imageSize: null,
    });
  });
});
