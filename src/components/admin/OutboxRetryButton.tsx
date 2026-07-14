'use client';
import { useState } from 'react';
export default function OutboxRetryButton() { const [message, setMessage] = useState(''); return <><button className="btn" onClick={async () => { const response = await fetch('/api/admin/outbox/retry', { method: 'POST' }); const payload = await response.json(); setMessage(payload.success ? `已投递 ${payload.data.delivered}/${payload.data.attempted}` : payload.error); }}>重试 Kafka 事件</button>{message && <span> {message}</span>}</>; }
