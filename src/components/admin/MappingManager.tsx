'use client';

import { useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type Mapping = { id: number; sourceKey: string; sourceTypeId: number; sourceTypeName: string; status: string; localCategoryId: number | null };
type Category = { id: number; name: string };
export default function MappingManager({ initialMappings, categories }: { initialMappings: Mapping[]; categories: Category[] }) {
  const [mappings, setMappings] = useState(initialMappings); const [message, setMessage] = useState('');
  const update = async (id: number, body: Record<string, unknown>) => { const response = await fetch(`/api/admin/mappings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); setMessage(payload.success ? '映射已更新' : payload.error || '更新失败'); if (payload.success) setMappings((items) => items.map((item) => item.id === id ? payload.data : item)); };
  return <><p className={styles.message}>{message}</p><table className={styles.table}><thead><tr><th>来源</th><th>来源分类</th><th>状态</th><th>本地分类</th><th>操作</th></tr></thead><tbody>{mappings.map((mapping) => <tr key={mapping.id}><td>{mapping.sourceKey}</td><td>{mapping.sourceTypeName} ({mapping.sourceTypeId})</td><td>{mapping.status}</td><td><select defaultValue={mapping.localCategoryId || ''} onChange={(event) => void update(mapping.id, { status: 'MAPPED', localCategoryId: Number(event.target.value) })}><option value="">选择分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td><td><button className={styles.button} onClick={() => void update(mapping.id, { status: 'IGNORED' })}>忽略</button></td></tr>)}</tbody></table></>;
}
