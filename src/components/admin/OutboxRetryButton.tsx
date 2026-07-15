'use client';
import { useState } from 'react';
import styles from '@/app/admin/admin.module.css';

export default function OutboxRetryButton() {
  const [message, setMessage] = useState('');

  return <div className={styles.toolbarActions}>
    <button className={styles.buttonSecondary} onClick={async () => {
      const response = await fetch('/api/admin/outbox/retry', { method: 'POST' });
      const payload = await response.json();
      setMessage(payload.success ? `已投递 ${payload.data.delivered}/${payload.data.attempted}` : payload.error);
    }}>
      重试 Kafka 事件
    </button>
    {message && <span className={styles.message}>{message}</span>}
  </div>;
}
