import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Snowfall route guard', () => {
  it('keeps decorative snow out of the analytics dashboard shell', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/layout/Snowfall.tsx'), 'utf8');
    expect(source).toContain("pathname.startsWith('/dashboard')");
  });
});
