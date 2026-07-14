'use client';
import { useState } from 'react';

export default function ThemeButton({ themeKey, active }: { themeKey: string; active: boolean }) {
  const [selected, setSelected] = useState(active);
  return <button className="btn" disabled={selected} onClick={async () => {
    const response = await fetch('/api/admin/themes/active', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeKey }) });
    if (response.ok) setSelected(true);
  }}>{selected ? '当前主题' : '启用'}</button>;
}
