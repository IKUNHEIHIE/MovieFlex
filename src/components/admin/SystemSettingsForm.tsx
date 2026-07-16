'use client';

import { useState } from 'react';
import type { AdminSystemSettings } from '@/lib/system-settings';
import styles from '@/app/admin/admin.module.css';

type Props = {
  settings: AdminSystemSettings;
};

export function SystemSettingsForm({ settings }: Props) {
  const [form, setForm] = useState({
    siteName: settings.siteName,
    siteSlogan: settings.siteSlogan,
    siteDescription: settings.siteDescription,
    siteLogoUrl: settings.siteLogoUrl,
    siteFaviconUrl: settings.siteFaviconUrl,
    aiBaseUrl: settings.aiBaseUrl,
    aiModelId: settings.aiModelId,
    aiApiKey: '',
  });
  const [status, setStatus] = useState<string | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(settings.aiApiKeyConfigured);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? '保存失败，请重试。');
      }
      const refreshed = await fetch('/api/admin/settings').then((res) => res.json()).catch(() => null);
      if (refreshed?.data) setKeyConfigured(Boolean(refreshed.data.aiApiKeyConfigured));
      setForm((current) => ({ ...current, aiApiKey: '' }));
      setStatus('保存成功');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '保存失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        <span>网站名称</span>
        <input className={styles.input} value={form.siteName} onChange={(event) => update('siteName', event.target.value)} />
      </label>
      <label>
        <span>网站简介</span>
        <input className={styles.input} value={form.siteSlogan} onChange={(event) => update('siteSlogan', event.target.value)} />
      </label>
      <label>
        <span>网站描述</span>
        <textarea className={styles.input} rows={4} value={form.siteDescription} onChange={(event) => update('siteDescription', event.target.value)} />
      </label>
      <label>
        <span>logoUrl</span>
        <input className={styles.input} value={form.siteLogoUrl} onChange={(event) => update('siteLogoUrl', event.target.value)} placeholder="/logo.png" />
      </label>
      <label>
        <span>faviconUrl</span>
        <input className={styles.input} value={form.siteFaviconUrl} onChange={(event) => update('siteFaviconUrl', event.target.value)} placeholder="/favicon.ico" />
      </label>
      <label>
        <span>AI API 端点</span>
        <input className={styles.input} value={form.aiBaseUrl} onChange={(event) => update('aiBaseUrl', event.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
      </label>
      <label>
        <span>模型 ID</span>
        <input className={styles.input} value={form.aiModelId} onChange={(event) => update('aiModelId', event.target.value)} placeholder="gpt-4o-mini" />
      </label>
      <label>
        <span>AI 密钥</span>
        <input className={styles.input} value={form.aiApiKey} onChange={(event) => update('aiApiKey', event.target.value)} placeholder={keyConfigured ? '已配置，留空则保持不变' : '未配置，请输入密钥'} type="password" />
      </label>

      <p className={styles.statusPill} style={{ justifySelf: 'start' }}>
        {keyConfigured ? 'AI 密钥：已配置' : 'AI 密钥：未配置'}
      </p>
      <p className={styles.statusWarning} style={{ margin: 0 }}>
        提示：上传电影封皮识别依赖支持多模态输入的模型，请在此处配置兼容 OpenAI 的视觉模型。
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" className={styles.button} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </button>
        {status && <span className={styles.badge}>{status}</span>}
      </div>
    </form>
  );
}
