'use client';
import { useState } from 'react';
import styles from '@/app/admin/admin.module.css';

export default function ThemeButton({ themeKey, active }: { themeKey: string; active: boolean }) {
  const [selected, setSelected] = useState(active);
  const [loading, setLoading] = useState(false);
  return <button className={selected ? styles.buttonGhost : styles.buttonSecondary} disabled={selected || loading} onClick={async () => {
    setLoading(true);
    const response = await fetch('/api/admin/themes/active', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeKey }) });
    if (response.ok) {
      setSelected(true);
      window.location.reload();
    }
    setLoading(false);
  }}>{selected ? '当前主题' : loading ? '切换中...' : '启用'}</button>;
}
