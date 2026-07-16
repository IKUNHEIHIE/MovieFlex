import { getAdminSystemSettings } from '@/lib/system-settings';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import styles from '../admin.module.css';
import { SystemSettingsForm } from '@/components/admin/SystemSettingsForm';

export default async function AdminSettingsPage() {
  const settings = await getAdminSystemSettings();

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader
        eyebrow="SYSTEM SETTINGS"
        title="系统设置"
        badge="网站信息 / AI 助手"
      />

      <section className={styles.panel}>
        <SystemSettingsForm settings={settings} />
      </section>
    </div>
  );
}
