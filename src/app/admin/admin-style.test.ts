import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const adminPages = [
  'src/app/admin/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/movies/page.tsx',
  'src/app/admin/themes/page.tsx',
  'src/app/admin/users/page.tsx',
  'src/app/admin/stats/movies/page.tsx',
  'src/app/admin/stats/categories/page.tsx',
  'src/app/admin/stats/users/page.tsx',
  'src/app/admin/stats/trends/page.tsx',
  'src/app/admin/catalog/sources/page.tsx',
  'src/app/admin/catalog/categories/page.tsx',
  'src/app/admin/catalog/page.tsx',
  'src/app/admin/mappings/page.tsx',
];

describe('admin style unification', () => {
  it('does not import the unfinished dark admin theme or helper components', () => {
    for (const page of adminPages) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');

      expect(source, page).not.toMatch(/admin-theme\.css/);
      expect(source, page).not.toMatch(/AdminButton|AdminCard|AdminTable/);
    }
  });

  it('keeps the real admin shell on admin.module.css', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/admin/layout.tsx'), 'utf8');

    expect(source).toContain("import styles from './admin.module.css'");
  });

  it('keeps admin stats tooltips on the shared light style', () => {
    const statsPages = adminPages.filter((page) => page.includes('/stats/'));

    for (const page of statsPages) {
      const source = readFileSync(join(process.cwd(), page), 'utf8');

      expect(source, page).not.toContain("background: 'linear-gradient");
      expect(source, page).not.toContain("color: 'white'");
    }
  });

  it('renders the admin overview as an operations cockpit', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/admin/page.tsx'), 'utf8');

    expect(source).toContain('getAdminOverviewData');
    expect(source).toContain('今日待处理');
    expect(source).toContain('采集状态');
    expect(source).toContain('内容库健康');
    expect(source).toContain('热门影片');
    expect(source).toContain('快捷操作');
    expect(source).not.toMatch(/admin-theme\.css|AdminButton|AdminCard|AdminTable/);
  });
});
