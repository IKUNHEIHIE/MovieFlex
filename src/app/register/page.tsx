'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const payload = await response.json(); setMessage(payload.success ? '注册成功，请登录。' : payload.error || '注册失败');
  };
  return <main className="container" style={{ maxWidth: 460, paddingTop: 64 }}><section className="glass" style={{ padding: 28, borderRadius: 'var(--radius-md)' }}><h1>注册 MovieFlex</h1><form onSubmit={submit} style={{ display: 'grid', gap: 14 }}><input className="input" name="username" required minLength={2} placeholder="用户名" /><input className="input" name="email" type="email" required placeholder="邮箱" /><input className="input" name="password" type="password" required minLength={6} placeholder="密码至少 6 位" /><button className="btn btn-primary" type="submit">注册</button></form>{message && <p>{message}</p>}<p>已有账号？<Link href="/login">去登录</Link></p></section></main>;
}
