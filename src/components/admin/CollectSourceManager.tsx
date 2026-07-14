'use client';

import { FormEvent, useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type Source = { id: number; name: string; apiUrl: string; sourceKey: string; format: 'JSON' | 'XML'; isActive: boolean; lastSync: string | null };
type CollectResult = { sourceName: string; mode: string; pagesProcessed: number; totalPages: number; fetched: number; saved: number; warnings: { sourceTypeId: number; sourceTypeName: string; reason: string }[] };
type Task = { id: string; sourceKey: string; mode: string; status: string; pagesProcessed: number; totalPages: number; fetched: number; saved: number; errorMessage: string | null; createdAt: string; finishedAt: string | null };

export default function CollectSourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [message, setMessage] = useState('');
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Source | null>(null);

  const loadSources = async () => {
    const response = await fetch('/api/collect/sources');
    const payload = await response.json();
    if (response.ok && payload.success) setSources(payload.data);
    else setMessage(payload.error || '无法加载采集源');
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial admin data must load after client mount.
  useEffect(() => { void loadSources(); }, []);
  const loadTasks = async () => { const response = await fetch('/api/collect/tasks'); const payload = await response.json(); if (response.ok && payload.success) setTasks(payload.data); };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial task data must load after client mount.
  useEffect(() => { void loadTasks(); }, []);

  const createSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/collect/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const payload = await response.json();
    if (!response.ok || !payload.success) { setMessage(payload.error || '新增采集源失败'); return; }
    event.currentTarget.reset();
    setMessage(`已新增采集源：${payload.data.name}`);
    await loadSources();
  };

  const runCollection = async (sourceKey: string, mode: 'recent' | 'full') => {
    setRunning(`${sourceKey}-${mode}`); setMessage(''); setResult(null);
    try {
      const response = await fetch('/api/collect/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceKey, mode, hours: 24 }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) setMessage(payload.error || '采集失败');
      else { setResult(payload.data); setMessage(`${payload.data.sourceName} 采集完成`); await loadSources(); await loadTasks(); }
    } catch { setMessage('采集请求失败，请检查网络和来源地址'); }
    finally { setRunning(null); }
  };
  const updateSource = async (sourceKey: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/collect/sources/${encodeURIComponent(sourceKey)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json(); setMessage(payload.success ? '采集源已更新' : payload.error || '更新失败'); if (payload.success) await loadSources();
  };
  const deleteSource = async (sourceKey: string) => {
    if (!window.confirm(`确认删除采集源 ${sourceKey}？`)) return;
    const response = await fetch(`/api/collect/sources/${encodeURIComponent(sourceKey)}`, { method: 'DELETE' }); const payload = await response.json(); setMessage(payload.success ? '采集源已删除' : payload.error || '删除失败'); if (payload.success) await loadSources();
  };
  const editSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return;
    const form = new FormData(event.currentTarget);
    await updateSource(editing.sourceKey, { name: form.get('name'), apiUrl: form.get('apiUrl'), format: form.get('format') });
    setEditing(null);
  };

  return <>
    <section className={styles.panel}><h2>新增采集源</h2><form className={styles.form} onSubmit={createSource}>
      <input name="name" required placeholder="来源名称" />
      <input name="sourceKey" required placeholder="唯一标识，如 liangzi" />
      <input name="apiUrl" required placeholder="AppleCMS API 地址" />
      <select name="format" defaultValue="JSON"><option value="JSON">JSON</option><option value="XML">XML</option></select>
      <button className={styles.button} type="submit">保存采集源</button>
    </form></section>
    {editing && <section className={styles.panel} style={{ marginTop: 18 }}><h2>编辑采集源：{editing.sourceKey}</h2><form className={styles.form} onSubmit={editSource}><input name="name" required defaultValue={editing.name} /><input name="apiUrl" required defaultValue={editing.apiUrl} /><select name="format" defaultValue={editing.format}><option value="JSON">JSON</option><option value="XML">XML</option></select><button className={styles.button}>保存修改</button><button className={styles.button} type="button" onClick={() => setEditing(null)}>取消</button></form></section>}
    {message && <p className={styles.message}>{message}</p>}
    {result && <section className={styles.panel}><h2>最近任务结果</h2><p>处理 {result.pagesProcessed}/{result.totalPages} 页，抓取 {result.fetched} 条，保存 {result.saved} 条。</p>{result.warnings.map((warning) => <p className={styles.warning} key={warning.sourceTypeId}>{warning.sourceTypeName}（{warning.sourceTypeId}）：{warning.reason}</p>)}</section>}
    <section className={styles.panel} style={{ marginTop: 18 }}><h2>已配置来源</h2><table className={styles.table}><thead><tr><th>名称</th><th>标识</th><th>格式</th><th>最近同步</th><th>操作</th></tr></thead><tbody>
      {sources.map((source) => <tr key={source.id}><td>{source.name}</td><td>{source.sourceKey}</td><td>{source.format}</td><td>{source.lastSync ? new Date(source.lastSync).toLocaleString() : '未同步'}</td><td><div className={styles.actions}><button className={styles.button} disabled={!source.isActive || running !== null} onClick={() => void runCollection(source.sourceKey, 'recent')}>最近 24 小时</button><button className={styles.button} disabled={!source.isActive || running !== null} onClick={() => void runCollection(source.sourceKey, 'full')}>全量</button><button className={styles.button} onClick={() => setEditing(source)}>编辑</button><button className={styles.button} onClick={() => void updateSource(source.sourceKey, { isActive: !source.isActive })}>{source.isActive ? '停用' : '启用'}</button><button className={styles.button} onClick={() => void deleteSource(source.sourceKey)}>删除</button></div></td></tr>)}
    </tbody></table></section>
    <section className={styles.panel} style={{ marginTop: 18 }}><h2>最近采集任务</h2><table className={styles.table}><thead><tr><th>来源</th><th>模式</th><th>状态</th><th>进度</th><th>抓取/保存</th><th>时间</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.sourceKey}</td><td>{task.mode}</td><td>{task.status}</td><td>{task.pagesProcessed}/{task.totalPages}</td><td>{task.fetched}/{task.saved}</td><td>{new Date(task.createdAt).toLocaleString()}{task.errorMessage ? ` · ${task.errorMessage}` : ''}</td></tr>)}</tbody></table></section>
  </>;
}
