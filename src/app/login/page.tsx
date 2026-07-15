'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { safeCallbackUrl } from '@/lib/auth/callback-url';

export default function LoginPage() {
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const result = await signIn('credentials', { email: form.get('email'), password: form.get('password'), redirect: false });
    if (result?.error) { setError('邮箱或密码错误'); return; }
    window.location.assign(safeCallbackUrl(new URLSearchParams(window.location.search).get('callbackUrl')));
  };
  return <main className="container" style={{ maxWidth: 460, paddingTop: 64 }}><section className="glass" style={{ padding: 28, borderRadius: 'var(--radius-md)' }}><h1>登录 MovieFlex</h1><form onSubmit={submit} style={{ display: 'grid', gap: 14 }}><input className="input" name="email" type="email" required placeholder="邮箱" /><input className="input" name="password" type="password" required placeholder="密码" /><button className="btn btn-primary" type="submit">登录</button></form>{error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}<p>还没有账号？<Link href="/register">立即注册</Link></p></section></main>;
}
