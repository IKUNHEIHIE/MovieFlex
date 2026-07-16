import { describe, expect, it } from 'vitest';
import { parseLocalAssistantConversation, serializeLocalAssistantConversation } from './assistant-storage';

describe('assistant local storage', () => {
  it('falls back to an empty single conversation for invalid storage', () => {
    expect(parseLocalAssistantConversation('not-json').messages).toEqual([]);
    expect(parseLocalAssistantConversation(null).messages).toEqual([]);
  });

  it('serializes and parses guest messages', () => {
    const serialized = serializeLocalAssistantConversation([
      { role: 'user', content: '推荐电影', hasImage: true, imageFileName: 'cover.jpg', imageMimeType: 'image/jpeg', imageSize: 100 },
    ]);

    expect(parseLocalAssistantConversation(serialized).messages).toEqual([
      { role: 'user', content: '推荐电影', hasImage: true, imageFileName: 'cover.jpg', imageMimeType: 'image/jpeg', imageSize: 100 },
    ]);
  });
});
