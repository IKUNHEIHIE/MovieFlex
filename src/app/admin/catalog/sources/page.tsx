import CollectSourceManager from '@/components/admin/CollectSourceManager';
import AdminPageHeader from '@/components/shared/AdminPageHeader';

export default function CatalogSourcesPage() {
  return <>
    <AdminPageHeader eyebrow="CATALOG" title="采集源管理" badge="AppleCMS" />
    <CollectSourceManager />
  </>;
}
