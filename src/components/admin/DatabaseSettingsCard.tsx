'use client';

import { useState, useEffect } from 'react';
import styles from '@/app/admin/admin.module.css';

interface DatabaseConfig {
  type: 'sqlite' | 'mysql';
  url: string;
  sqliteUrl: string;
  mysqlUrl: string;
}

export function DatabaseSettingsCard() {
  const [config, setConfig] = useState<DatabaseConfig | null>(null);
  const [selectedType, setSelectedType] = useState<'sqlite' | 'mysql'>('sqlite');
  const [sqliteUrl, setSqliteUrl] = useState('file:./prisma/dev.db');
  const [mysqlUrl, setMysqlUrl] = useState('mysql://root:password@127.0.0.1:3306/movieflex');
  
  const [testing, setTesting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [switchStatus, setSwitchStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings/database');
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
        setSelectedType(json.data.type);
        if (json.data.sqliteUrl) setSqliteUrl(json.data.sqliteUrl);
        if (json.data.mysqlUrl) setMysqlUrl(json.data.mysqlUrl);
      }
    } catch (e) {
      console.error('Failed to fetch db config', e);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const currentUrl = selectedType === 'sqlite' ? sqliteUrl : mysqlUrl;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, url: currentUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ ok: true, msg: data.message || '连接测试通过！' });
      } else {
        setTestResult({ ok: false, msg: data.error || '连接测试失败' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || '网络请求错误' });
    } finally {
      setTesting(false);
    }
  };

  const handleSwitch = async () => {
    const isCurrent = config?.type === selectedType && config?.url === currentUrl;
    if (isCurrent) {
      alert('当前运行的正是该数据库配置，无需切换。');
      return;
    }

    if (!confirm(`确认要将数据库引擎切换为 ${selectedType.toUpperCase()} 吗？\n切换后系统将更新 Schema、自动补全表结构并重载服务。`)) {
      return;
    }

    setSwitching(true);
    setSwitchStatus('正在切换 Schema 并更新 Prisma 客户端...');
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/settings/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, url: currentUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSwitchStatus(data.message || '切换成功！服务正在重载...');
        let timer = 5;
        setCountdown(timer);
        const interval = setInterval(() => {
          timer -= 1;
          setCountdown(timer);
          if (timer <= 0) {
            clearInterval(interval);
            window.location.reload();
          }
        }, 1000);
      } else {
        setSwitchStatus(`切换失败: ${data.error || '未知错误'}`);
        setSwitching(false);
      }
    } catch (err: any) {
      setSwitchStatus(`切换异常: ${err.message || '网络连接中断'}`);
      setSwitching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>数据库引擎设置（MySQL / SQLite 自由切换）</h3>
        {config && (
          <span className={styles.statusPill} style={{ background: config.type === 'sqlite' ? '#1e293b' : '#0369a1' }}>
            当前运行引擎：<strong>{config.type.toUpperCase()}</strong>
          </span>
        )}
      </div>

      <p style={{ margin: 0, color: 'var(--muted, #64748b)', fontSize: 14 }}>
        支持零配置的嵌入式 <strong>SQLite</strong> 本地数据库与高性能独立的 <strong>MySQL / MariaDB</strong> 自由切换。
      </p>

      {/* 引擎选择单选框 */}
      <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="dbType"
            value="sqlite"
            checked={selectedType === 'sqlite'}
            onChange={() => setSelectedType('sqlite')}
            disabled={switching}
          />
          <span><strong>SQLite</strong>（单文件零配置，适合私有化/单机部署）</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="radio"
            name="dbType"
            value="mysql"
            checked={selectedType === 'mysql'}
            onChange={() => setSelectedType('mysql')}
            disabled={switching}
          />
          <span><strong>MySQL / MariaDB</strong>（独立数据库服务，适合生产高并发）</span>
        </label>
      </div>

      {/* 动态输入项 */}
      {selectedType === 'sqlite' ? (
        <label className={styles.label}>
          <span>SQLite 文件路径 (DATABASE_URL)</span>
          <input
            className={styles.input}
            value={sqliteUrl}
            onChange={(e) => setSqliteUrl(e.target.value)}
            placeholder="file:./prisma/dev.db"
            disabled={switching}
          />
          <small style={{ color: '#94a3b8', marginTop: 4 }}>
            标准格式为 <code>file:./prisma/dev.db</code> 或绝对路径。
          </small>
        </label>
      ) : (
        <label className={styles.label}>
          <span>MySQL 连接串 (DATABASE_URL)</span>
          <input
            className={styles.input}
            value={mysqlUrl}
            onChange={(e) => setMysqlUrl(e.target.value)}
            placeholder="mysql://root:password@127.0.0.1:3306/movieflex"
            disabled={switching}
          />
          <small style={{ color: '#94a3b8', marginTop: 4 }}>
            标准格式为 <code>mysql://username:password@host:port/database</code>。
          </small>
        </label>
      )}

      {/* 操作按钮区 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
        <button
          type="button"
          onClick={handleTest}
          className={styles.button}
          disabled={testing || switching}
          style={{ background: 'transparent', border: '1px solid #475569' }}
        >
          {testing ? '正在测试连接...' : '测试连接'}
        </button>

        <button
          type="button"
          onClick={handleSwitch}
          className={styles.button}
          disabled={testing || switching}
        >
          {switching ? '切换处理中...' : '应用并切换数据库'}
        </button>

        {testResult && (
          <span style={{ color: testResult.ok ? '#4ade80' : '#f87171', fontSize: 14 }}>
            {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
          </span>
        )}
      </div>

      {/* 状态通知与倒计时 */}
      {switchStatus && (
        <div style={{
          padding: 12,
          borderRadius: 6,
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          color: '#38bdf8',
          fontSize: 14
        }}>
          {switchStatus}
          {countdown !== null && (
            <span style={{ marginLeft: 12, fontWeight: 'bold' }}>
              页面将在 {countdown} 秒后自动刷新...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
