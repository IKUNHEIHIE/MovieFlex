'use client';
import { useState } from 'react';

export default function ProfileSettings({ username, email }: { username: string; email: string }) {
  const [message, setMessage] = useState('');
  const submitProfile = async (form: FormData) => {
    const response = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), email: form.get('email') }) });
    const payload = await response.json(); setMessage(payload.success ? '账号信息已更新，刷新页面后导航栏会同步显示。' : payload.error);
  };
  const submitPassword = async (form: FormData) => {
    const response = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }) });
    const payload = await response.json(); setMessage(payload.success ? '密码已更新。' : payload.error);
  };
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
    <form className="glass" action={async (form) => submitProfile(form)} style={{ padding: 20, borderRadius: 12, display: 'grid', gap: 10 }}><h2>账号信息</h2><input className="input" name="username" defaultValue={username} required maxLength={50} /><input className="input" name="email" type="email" defaultValue={email} required /><button className="btn btn-primary">保存账号信息</button></form>
    <form className="glass" action={async (form) => submitPassword(form)} style={{ padding: 20, borderRadius: 12, display: 'grid', gap: 10 }}><h2>修改密码</h2><input className="input" name="currentPassword" type="password" placeholder="当前密码" required /><input className="input" name="newPassword" type="password" placeholder="新密码（至少 6 位）" required minLength={6} /><button className="btn btn-primary">更新密码</button></form>
    {message && <p style={{ gridColumn: '1 / -1', margin: 0 }}>{message}</p>}
  </div>;
}
