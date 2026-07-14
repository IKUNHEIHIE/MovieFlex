import prisma from '@/lib/prisma';
import styles from '../admin.module.css';
import ThemeButton from '@/components/admin/ThemeButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';

export default async function AdminThemesPage() {
  const [themes, setting] = await Promise.all([prisma.theme.findMany({ orderBy: { name: 'asc' } }), prisma.systemSetting.findUnique({ where: { key: 'active_theme' } })]);
  const activeTheme = setting?.value || 'ice-blue';
  return <>
    <AdminPageHeader eyebrow="THEMES" title="主题管理" badge={`当前：${activeTheme}`} />
    <section className={styles.panel}><h2>已安装主题</h2><table className={styles.table}><thead><tr><th>名称</th><th>标识</th><th>作者</th><th>版本</th><th>操作</th></tr></thead><tbody><tr><td>冰蓝放映夜</td><td>ice-blue</td><td>MovieFlex</td><td>1.0.0</td><td><ThemeButton themeKey="ice-blue" active={activeTheme === 'ice-blue'} /></td></tr>{themes.map((theme) => <tr key={theme.id}><td>{theme.name}</td><td>{theme.themeKey}</td><td>{theme.author || '-'}</td><td>{theme.version || '-'}</td><td><ThemeButton themeKey={theme.themeKey} active={activeTheme === theme.themeKey} /></td></tr>)}</tbody></table></section>
  </>;
}
