'use client';
import { useState } from 'react';
export default function HistoryDeleteButton({ id }: { id: number }) { const [removed, setRemoved] = useState(false); if (removed) return null; return <button className="btn" onClick={async () => { const response = await fetch(`/api/user/history/${id}`, { method: 'DELETE' }); if (response.ok) setRemoved(true); }}>删除</button>; }
