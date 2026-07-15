import { describe, expect, it } from 'vitest';
import { normalizeMetadataValue } from './metadata-normalization';

describe('normalizeMetadataValue', () => {
  it('keeps a single normalized value unchanged', () => {
    expect(normalizeMetadataValue('中国大陆')).toBe('中国大陆');
  });

  it('uses the first value from slash- or comma-separated source metadata', () => {
    expect(normalizeMetadataValue('中国大陆 / 中国香港')).toBe('中国大陆');
    expect(normalizeMetadataValue('粤语,汉语普通话')).toBe('粤语');
  });

  it('returns null for blank source metadata', () => {
    expect(normalizeMetadataValue('   ')).toBeNull();
    expect(normalizeMetadataValue(null)).toBeNull();
  });
});
