import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const adminPages = [
  'src/app/admin/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/movies/page.tsx',
  'src/app/admin/themes/page.tsx',
  'src/app/admin/settings/page.tsx',
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

const adminCss = () => readFileSync(join(process.cwd(), 'src/app/admin/admin.module.css'), 'utf8');
const statsPage = (name: 'movies' | 'categories' | 'users' | 'trends') => readFileSync(join(process.cwd(), `src/app/admin/stats/${name}/page.tsx`), 'utf8');

describe('admin style unification', () => {
  it('provides shared showcase dashboard layout utilities', () => {
    const css = adminCss();

    for (const className of ['showcaseGrid', 'heroChart', 'insightGrid', 'insightCard', 'miniChartGrid', 'chartNarrative', 'heatmapGrid', 'heatmapCell', 'opportunityMatrix', 'funnelList', 'rankList']) {
      expect(css).toContain(`.${className}`);
    }
    expect(css).toContain('@media (max-width: 900px)');
  });

  it('upgrades the movie heat page into a showcase dashboard', () => {
    const source = statsPage('movies');

    expect(source).toContain('ScatterChart');
    expect(source).toContain('RadarChart');
    expect(source).toContain('观看收藏气泡图');
    expect(source).toContain('综合热度雷达');
    expect(source).toContain('爆款洞察');
  });

  it('upgrades the category distribution page into a showcase dashboard', () => {
    const source = statsPage('categories');

    expect(source).toContain('供需对比');
    expect(source).toContain('收藏转化排行');
    expect(source).toContain('分类机会矩阵');
    expect(source).toContain('opportunityMatrix');
  });

  it('upgrades the user behavior page into a showcase dashboard', () => {
    const source = statsPage('users');

    expect(source).toContain('ScatterChart');
    expect(source).toContain('活跃漏斗');
    expect(source).toContain('观看深度分布');
    expect(source).toContain('用户价值排行');
    expect(source).toContain('行为散点图');
  });

  it('upgrades the trend page into a showcase dashboard', () => {
    const source = statsPage('trends');

    expect(source).toContain('用户/游客观看趋势');
    expect(source).toContain('收藏转化率趋势');
    expect(source).toContain('活跃日历热力图');
    expect(source).toContain('趋势洞察');
    expect(source).toContain('heatmapGrid');
  });

  it('renders the admin dashboard as a dark operations command center', () => {
    const healthMonitor = readFileSync(join(process.cwd(), 'src/components/admin/HealthMonitor.tsx'), 'utf8');
    const css = adminCss();

    expect(healthMonitor).toContain('MovieFlex 实时运营指挥中心');
    expect(healthMonitor).toContain('全链路数据监控');
    expect(healthMonitor).toContain('链路拓扑');
    expect(healthMonitor).toContain('告警中心');
    expect(healthMonitor).toContain('系统健康雷达');
    expect(healthMonitor).toContain('活跃日历热力图');
    for (const className of ['commandCenter', 'commandHero', 'commandMetricGrid', 'signalNode', 'alertTower', 'opsTimeline', 'screenGlow']) {
      expect(css).toContain(`.${className}`);
    }
  });

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

  it('includes the system settings menu entry', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/admin/OperationsSidebar.tsx'), 'utf8');

    expect(source).toContain('/admin/settings');
    expect(source).toContain('系统设置');
  });
});
