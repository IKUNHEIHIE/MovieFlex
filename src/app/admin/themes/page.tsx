import prisma from '@/lib/prisma';
import ThemeButton from '@/components/admin/ThemeButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import styles from '../admin.module.css';

export default async function AdminThemesPage() {
  const [themes, setting] = await Promise.all([prisma.theme.findMany({ orderBy: { name: 'asc' } }), prisma.systemSetting.findUnique({ where: { key: 'active_theme' } })]);
  const activeTheme = setting?.value || 'ice-blue';

  const builtinThemes = [
    { name: '冰蓝放映夜', key: 'ice-blue', author: 'MovieFlex', version: '1.0.0' },
    { name: '淡蓝影院', key: 'azure', author: 'MovieFlex', version: '1.0.0' },
  ];

  return <div className={styles.pageStack}>
    <AdminPageHeader eyebrow="THEMES" title="主题管理" badge={`当前：${activeTheme}`} />
    <section className={styles.panel}>
      <h2>内置主题</h2>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.tableRowHover}`}>
          <thead>
            <tr>
              <th>名称</th><th>标识</th><th>作者</th><th>版本</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {builtinThemes.map((theme) => (
              <tr key={theme.key}>
                <td>{theme.name}</td>
                <td>{theme.key}</td>
                <td>{theme.author}</td>
                <td>{theme.version}</td>
                <td><ThemeButton themeKey={theme.key} active={activeTheme === theme.key} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
    {themes.length > 0 && (
      <section className={styles.panel}>
        <h2>自定义主题</h2>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.tableRowHover}`}>
            <thead>
              <tr>
                <th>名称</th><th>标识</th><th>作者</th><th>版本</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.id}>
                  <td>{theme.name}</td>
                  <td>{theme.themeKey}</td>
                  <td>{theme.author || '-'}</td>
                  <td>{theme.version || '-'}</td>
                  <td><ThemeButton themeKey={theme.themeKey} active={activeTheme === theme.themeKey} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}
  </div>;
}
