import CollectSourceManager from '@/components/admin/CollectSourceManager';
import styles from '../admin.module.css';

export default function AdminSourcesPage() {
  return <>
    <header className={styles.header}><div><p>COLLECTOR</p><h1>采集源管理</h1></div><span>AppleCMS</span></header>
    <CollectSourceManager />
  </>;
}
