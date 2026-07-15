import prisma from '@/lib/prisma';
import '../admin-theme.css';
import ThemeButton from '@/components/admin/ThemeButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AdminCard from '@/components/admin/AdminCard';

export default async function AdminThemesPage() {
  const [themes, setting] = await Promise.all([prisma.theme.findMany({ orderBy: { name: 'asc' } }), prisma.systemSetting.findUnique({ where: { key: 'active_theme' } })]);
  const activeTheme = setting?.value || 'ice-blue';

  const builtinThemes = [
    { name: '冰蓝放映夜', key: 'ice-blue', author: 'MovieFlex', version: '1.0.0' },
    { name: '淡蓝影院', key: 'azure', author: 'MovieFlex', version: '1.0.0' },
  ];

  return <>
    <AdminPageHeader eyebrow="THEMES" title="主题管理" badge={`当前：${activeTheme}`} />
    <AdminCard title="内置主题">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr><th style={{ padding: '12px 16px', textAlign: 'left' }}>名称</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>标识</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>作者</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>版本</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>操作</th></tr></thead><tbody>{builtinThemes.map((theme) => <tr key={theme.key}><td style={{ padding: '12px 16px' }}>{theme.name}</td><td style={{ padding: '12px 16px' }}>{theme.key}</td><td style={{ padding: '12px 16px' }}>{theme.author}</td><td style={{ padding: '12px 16px' }}>{theme.version}</td><td style={{ padding: '12px 16px' }}><ThemeButton themeKey={theme.key} active={activeTheme === theme.key} /></td></tr>)}</tbody></table>
    </AdminCard>
    {themes.length > 0 && <AdminCard title="自定义主题" style={{ marginTop: '24px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}><thead><tr><th style={{ padding: '12px 16px', textAlign: 'left' }}>名称</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>标识</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>作者</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>版本</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>操作</th></tr></thead><tbody>{themes.map((theme) => <tr key={theme.id}><td style={{ padding: '12px 16px' }}>{theme.name}</td><td style={{ padding: '12px 16px' }}>{theme.themeKey}</td><td style={{ padding: '12px 16px' }}>{theme.author || '-'}</td><td style={{ padding: '12px 16px' }}>{theme.version || '-'}</td><td style={{ padding: '12px 16px' }}><ThemeButton themeKey={theme.themeKey} active={activeTheme === theme.themeKey} /></td></tr>)}</tbody></table>
    </AdminCard>}
  </>;
}
