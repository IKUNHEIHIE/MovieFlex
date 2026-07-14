import { redirect } from 'next/navigation';

export default function OldMappingsPage() {
  redirect('/admin/catalog/categories');
}
