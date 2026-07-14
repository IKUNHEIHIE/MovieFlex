'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/app/admin/admin.module.css';
import { parsePlayerConfig, detectPlayerMode } from '@/lib/collector/player-config';
import { suggestSourceKey } from '@/lib/collector/source-key';
import { ACTIVE_TASK_STATUSES } from '@/lib/collector/task-types';

type Source = {
  id: number;
  name: string;
  apiUrl: string;
  sourceKey: string;
  format: 'JSON' | 'XML';
  isActive: boolean;
  lastSync: string | null;
  playerConfigs?: { code: string; name: string; isEnabled: boolean; mode: string; resolverUrl: string | null }[];
};

type Task = {
  id: string;
  sourceKey: string;
  mode: string;
  status: string;
  totalPages: number;
  pagesProcessed: number;
  fetched: number;
  saved: number;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
};

const MODE_LABEL: Record<string, string> = {
  'initial-100': '首批 100 条',
  'full': '全量',
};

const STATUS_LABEL: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '运行中',
  PAUSED: '已暂停',
  SUCCEEDED: '已完成',
  FAILED: '失败',
  CANCELLED: '已取消',
};

function buildPlayerConfigPayload(text: string) {
  if (!text.trim()) return null;
  const configs = parsePlayerConfig(text);
  if (configs.length === 0) return null;
  return configs.map(cfg => {
    const mode = detectPlayerMode(cfg.code);
    return {
      from: cfg.from,
      show: cfg.show,
      mode: mode?.mode || 'IFRAME_DIRECT',
      resolverUrl: mode?.resolverUrl,
      code: cfg.code,
    };
  });
}

export default function CollectSourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [playerConfigText, setPlayerConfigText] = useState('');
  const [newApiUrl, setNewApiUrl] = useState('');
  const [newSourceKey, setNewSourceKey] = useState('');
  const [sourceKeyManual, setSourceKeyManual] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSources = useCallback(async () => {
    try {
      const response = await fetch('/api/collect/sources');
      const payload = await response.json();
      if (response.ok && payload.success) {
        setSources(payload.data);
        setLoadError('');
      } else {
        setLoadError(payload.error || '无法加载采集源');
      }
    } catch {
      setLoadError('无法加载采集源，请检查网络');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/collect/tasks');
      const payload = await response.json();
      if (response.ok && payload.success) setTasks(payload.data);
    } catch { /* ignore transient polling errors */ }
  }, []);

  useEffect(() => { void loadSources(); }, [loadSources]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const hasActiveTasks = tasks.some(t => ACTIVE_TASK_STATUSES.includes(t.status as typeof ACTIVE_TASK_STATUSES[number]));

  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (hasActiveTasks) {
      pollingRef.current = setInterval(() => { void loadTasks(); }, 3000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [hasActiveTasks, loadTasks]);

  const handleApiUrlBlur = () => {
    if (!sourceKeyManual && newApiUrl) {
      try { setNewSourceKey(suggestSourceKey(newApiUrl)); } catch { /* invalid URL, ignore */ }
    }
  };

  const handleSourceKeyChange = (value: string) => {
    setNewSourceKey(value);
    setSourceKeyManual(value.length > 0);
  };

  const handlePlayerConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setPlayerConfigText(event.target?.result as string); };
    reader.readAsText(file);
  };

  const createSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      name: form.get('name'),
      apiUrl: newApiUrl,
      sourceKey: newSourceKey || undefined,
      format: form.get('format'),
    };

    if (playerConfigText) {
      const configs = buildPlayerConfigPayload(playerConfigText);
      if (!configs) {
        setMessage('播放器配置解析失败');
        setIsSaving(false);
        return;
      }
      body.playerConfigs = JSON.stringify(configs);
    }

    try {
      const response = await fetch('/api/collect/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.error || '新增采集源失败');
        setIsSaving(false);
        return;
      }
      const created = payload.data as Source;
      setSources(prev => [created, ...prev]);
      setNewApiUrl('');
      setNewSourceKey('');
      setSourceKeyManual(false);
      setPlayerConfigText('');
      setMessage(`已新增采集源：${created.name}`);
    } catch {
      setMessage('新增采集源失败，请检查网络');
    } finally {
      setIsSaving(false);
    }
  };

  const createTask = async (sourceKey: string, mode: 'initial-100' | 'full') => {
    setMessage('');
    try {
      const response = await fetch('/api/collect/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceKey, mode }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.error || '采集任务创建失败');
        return;
      }
      setTasks(prev => [payload.data, ...prev]);
      setMessage(`${MODE_LABEL[mode]} 任务已创建`);
    } catch {
      setMessage('采集请求失败，请检查网络');
    }
  };

  const mutateTask = async (taskId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const response = await fetch(`/api/collect/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.error || '任务操作失败');
        return;
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...payload.data } : t));
    } catch {
      setMessage('任务操作失败');
    }
  };

  const updateSource = async (sourceKey: string, body: Record<string, unknown>) => {
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/collect/sources/${encodeURIComponent(sourceKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.error || '更新失败');
        return;
      }
      const updated = payload.data as Source;
      setSources(prev => prev.map(s => s.sourceKey === sourceKey ? updated : s));
      setMessage('采集源已更新');
      setEditing(null);
      setIsEditing(false);
      setPlayerConfigText('');
    } catch {
      setMessage('更新失败，请检查网络');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSource = async (sourceKey: string) => {
    if (!window.confirm(`确认删除采集源 ${sourceKey}？`)) return;
    setMessage('');
    try {
      const response = await fetch(`/api/collect/sources/${encodeURIComponent(sourceKey)}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.error || '删除失败');
        return;
      }
      setSources(prev => prev.filter(s => s.sourceKey !== sourceKey));
      setMessage('采集源已删除');
    } catch {
      setMessage('删除失败');
    }
  };

  const startEditing = (source: Source) => {
    setEditing(source);
    setIsEditing(true);
    setPlayerConfigText('');
  };

  const editSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      name: form.get('name'),
      apiUrl: form.get('apiUrl'),
      format: form.get('format'),
    };
    if (playerConfigText) {
      const configs = buildPlayerConfigPayload(playerConfigText);
      if (!configs) {
        setMessage('播放器配置解析失败');
        return;
      }
      body.playerConfigs = JSON.stringify(configs);
    }
    await updateSource(editing.sourceKey, body);
  };

  return <>
    <section className={styles.panel}>
      <h2>新增采集源</h2>
      <form className={styles.form} onSubmit={createSource}>
        <input name="name" required placeholder="来源名称" disabled={isSaving} />
        <input
          value={newSourceKey}
          onChange={(e) => handleSourceKeyChange(e.target.value)}
          placeholder="唯一标识（可留空自动生成）"
          disabled={isSaving}
        />
        <input
          value={newApiUrl}
          onChange={(e) => setNewApiUrl(e.target.value)}
          onBlur={handleApiUrlBlur}
          required
          placeholder="AppleCMS API 地址"
          disabled={isSaving}
        />
        <select name="format" defaultValue="JSON" disabled={isSaving}>
          <option value="JSON">JSON</option>
          <option value="XML">XML</option>
        </select>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '8px' }}>播放器配置（可选）</label>
          <input
            type="file"
            accept=".txt,.json"
            onChange={handlePlayerConfigFile}
            style={{ marginBottom: '8px' }}
            disabled={isSaving}
          />
          <textarea
            value={playerConfigText}
            onChange={(e) => setPlayerConfigText(e.target.value)}
            placeholder="或粘贴播放器配置 JSON..."
            rows={4}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            disabled={isSaving}
          />
        </div>
        <button className={styles.button} type="submit" disabled={isSaving}>
          {isSaving ? '保存中...' : '保存采集源'}
        </button>
      </form>
    </section>

    {editing && (
      <section className={styles.panel} style={{ marginTop: 18 }}>
        <h2>编辑采集源：{editing.sourceKey}</h2>
        <form className={styles.form} onSubmit={editSource}>
          <input name="name" required defaultValue={editing.name} disabled={isSaving} />
          <input name="apiUrl" required defaultValue={editing.apiUrl} disabled={isSaving} />
          <select name="format" defaultValue={editing.format} disabled={isSaving}>
            <option value="JSON">JSON</option>
            <option value="XML">XML</option>
          </select>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              播放器配置（当前：{editing.playerConfigs?.length || 0} 个）
            </label>
            <input
              type="file"
              accept=".txt,.json"
              onChange={handlePlayerConfigFile}
              style={{ marginBottom: '8px' }}
              disabled={isSaving}
            />
            <textarea
              value={playerConfigText}
              onChange={(e) => setPlayerConfigText(e.target.value)}
              placeholder="上传新文件或粘贴新配置..."
              rows={4}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
              disabled={isSaving}
            />
          </div>
          <button className={styles.button} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存修改'}
          </button>
          <button className={styles.button} type="button" onClick={() => {
            setEditing(null);
            setIsEditing(false);
            setPlayerConfigText('');
          }} disabled={isSaving}>取消</button>
        </form>
      </section>
    )}

    {(message || loadError) && (
      <p role="status" aria-live="polite" className={styles.message}>
        {loadError || message}
      </p>
    )}

    <section className={styles.panel} style={{ marginTop: 18 }}>
      <h2>已配置来源</h2>
      {loadError && sources.length === 0 ? (
        <p>{loadError}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>名称</th>
              <th>标识</th>
              <th>格式</th>
              <th>播放器</th>
              <th>最近同步</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>{source.name}</td>
                <td>{source.sourceKey}</td>
                <td>{source.format}</td>
                <td>{source.playerConfigs?.length || 0} 个</td>
                <td>{source.lastSync ? new Date(source.lastSync).toLocaleString() : '未同步'}</td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.button}
                      disabled={!source.isActive}
                      onClick={() => void createTask(source.sourceKey, 'initial-100')}
                    >
                      首批 100 条
                    </button>
                    <button
                      className={styles.button}
                      disabled={!source.isActive}
                      onClick={() => void createTask(source.sourceKey, 'full')}
                    >
                      全量采集
                    </button>
                    <button className={styles.button} onClick={() => startEditing(source)}>编辑</button>
                    <button
                      className={styles.button}
                      onClick={() => void updateSource(source.sourceKey, { isActive: !source.isActive })}
                    >
                      {source.isActive ? '停用' : '启用'}
                    </button>
                    <button className={styles.button} onClick={() => void deleteSource(source.sourceKey)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>

    <section className={styles.panel} style={{ marginTop: 18 }}>
      <h2>采集任务</h2>
      {tasks.length === 0 ? (
        <p>暂无采集任务</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>来源</th>
              <th>模式</th>
              <th>状态</th>
              <th>进度</th>
              <th>抓取/保存</th>
              <th>操作</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.sourceKey}</td>
                <td>{MODE_LABEL[task.mode] || task.mode}</td>
                <td>{STATUS_LABEL[task.status] || task.status}</td>
                <td>{task.pagesProcessed}/{task.totalPages || '?'}</td>
                <td>{task.fetched}/{task.saved}</td>
                <td>
                  <div className={styles.actions}>
                    {task.status === 'RUNNING' && (
                      <button className={styles.button} onClick={() => void mutateTask(task.id, 'pause')}>暂停</button>
                    )}
                    {task.status === 'PAUSED' && (
                      <button className={styles.button} onClick={() => void mutateTask(task.id, 'resume')}>继续</button>
                    )}
                    {(task.status === 'QUEUED' || task.status === 'RUNNING' || task.status === 'PAUSED') && (
                      <button className={styles.button} onClick={() => void mutateTask(task.id, 'cancel')}>取消</button>
                    )}
                  </div>
                </td>
                <td>
                  {new Date(task.createdAt).toLocaleString()}
                  {task.errorMessage ? ` · ${task.errorMessage}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  </>;
}
