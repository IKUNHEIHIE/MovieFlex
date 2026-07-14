'use client';
import { useState } from 'react';

export default function RoleButton({ id, role }: { id: number; role: 'USER' | 'ADMIN' }) {
  const [current, setCurrent] = useState(role);
  return <button className="btn" onClick={async () => {
    const next = current === 'ADMIN' ? 'USER' : 'ADMIN';
    const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: next }) });
    if (response.ok) setCurrent(next);
  }}>{current === 'ADMIN' ? '降为用户' : '设为管理员'}</button>;
}
