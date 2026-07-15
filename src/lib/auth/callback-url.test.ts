import { describe, expect, it } from 'vitest';
import { safeCallbackUrl } from './callback-url';

describe('safeCallbackUrl', () => {
  it('allows only internal non-protocol-relative callback paths', () => {
    expect(safeCallbackUrl('/user/profile')).toBe('/user/profile');
    expect(safeCallbackUrl('//evil.example')).toBe('/');
    expect(safeCallbackUrl('https://evil.example')).toBe('/');
  });
});
