import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const serverPages = [
  'src/app/admin/movies/page.tsx',
  'src/app/admin/themes/page.tsx',
];

describe('admin server component boundaries', () => {
  it('does not pass browser event handlers from server pages', () => {
    for (const page of serverPages) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');
      expect(source, page).not.toMatch(/onMouse(?:Enter|Leave|Down|Up)=/);
    }
  });

  it('does not pass render or rowKey functions from server pages to client tables', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/admin/themes/page.tsx'), 'utf8');
    expect(source).not.toContain('<AdminTable');
    expect(source).not.toMatch(/render:\s*\(/);
    expect(source).not.toMatch(/rowKey=\{\(/);
  });
});
