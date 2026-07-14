import { describe, expect, it } from 'vitest';
import { suggestSourceKey } from './source-key';

describe('suggestSourceKey', () => {
  it('derives a stable ASCII key from host and endpoint path', () => {
    expect(suggestSourceKey('https://api.qzzy.example/provide/vod/')).toBe('api-qzzy-example-provide-vod');
  });
});
