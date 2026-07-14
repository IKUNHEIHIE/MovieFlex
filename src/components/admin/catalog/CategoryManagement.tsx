'use client';

import { useState, useEffect } from 'react';
import styles from '@/app/admin/admin.module.css';
import CategoryTree from './CategoryTree';
import AdminPageHeader from '@/components/shared/AdminPageHeader';

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  movieCount?: number;
  children?: Category[];
}

interface Mapping {
  id: number;
  sourceKey: string;
  sourceTypeId: number;
  sourceTypeName: string;
  localCategoryId: number | null;
  status: string;
  isAuto: boolean;
}

interface Source {
  sourceKey: string;
  name: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (sourceKey?: string) => {
    try {
      const [catRes, mapRes] = await Promise.all([
        fetch('/api/admin/catalog/categories'),
        fetch(`/api/admin/mappings${sourceKey ? `?sourceKey=${encodeURIComponent(sourceKey)}` : ''}`)
      ]);

      const catData = await catRes.json();
      const mapData = await mapRes.json();

      if (catData.success) {
        setCategories(catData.data);
      }
      if (mapData.success) {
        setMappings(mapData.data.mappings || []);
        setSources(mapData.data.sources || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setStatus({ kind: 'error', message: '加载数据失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (sourceKey: string) => {
    setSelectedSource(sourceKey);
    setLoading(true);
    fetchData(sourceKey);
  };

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    try {
      const res = await fetch('/api/admin/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, parentId })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setParentId(null);
        setStatus({ kind: 'success', message: `分类"${name}"已创建` });
        fetchData(selectedSource || undefined);
      } else {
        setStatus({ kind: 'error', message: data.error || '创建失败' });
      }
    } catch {
      setStatus({ kind: 'error', message: '创建失败' });
    }
  };

  const handleEditCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    try {
      const res = await fetch(`/api/admin/catalog/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      });

      const data = await res.json();
      if (data.success) {
        setEditingCategory(null);
        fetchData(selectedSource || undefined);
      } else {
        setStatus({ kind: 'error', message: data.error || '更新失败' });
      }
    } catch {
      setStatus({ kind: 'error', message: '更新失败' });
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`确定要删除分类"${category.name}"吗？`)) return;

    try {
      const res = await fetch(`/api/admin/catalog/categories/${category.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        fetchData(selectedSource || undefined);
      } else {
        setStatus({ kind: 'error', message: data.error || '删除失败' });
      }
    } catch {
      setStatus({ kind: 'error', message: '删除失败' });
    }
  };

  const findLocalCategoryName = (id: number | null): string => {
    if (!id) return '—';
    for (const cat of categories) {
      if (cat.id === id) return cat.name;
      if (cat.children) {
        for (const child of cat.children) {
          if (child.id === id) return child.name;
        }
      }
    }
    return '(未知分类)';
  };

  const handleUpdateMapping = async (mappingId: number, status: 'MAPPED' | 'IGNORED', localCategoryId?: number) => {
    try {
      const res = await fetch(`/api/admin/mappings/${mappingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, localCategoryId: status === 'MAPPED' ? localCategoryId : undefined })
      });

      const data = await res.json();
      if (data.success) {
        fetchData(selectedSource || undefined);
      } else {
        setStatus({ kind: 'error', message: data.error || '更新映射失败' });
      }
    } catch {
      setStatus({ kind: 'error', message: '更新映射失败' });
    }
  };

  const handleReclassify = async () => {
    if (!selectedSource) return;
    if (!confirm(`将重新分类"${sources.find(s => s.sourceKey === selectedSource)?.name || selectedSource}"的所有已采集影片，是否继续？`)) return;

    try {
      const res = await fetch(`/api/admin/mappings/reclassify?sourceKey=${encodeURIComponent(selectedSource)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ kind: 'success', message: `已重新分类 ${data.data.updated} 部影片` });
      } else {
        setStatus({ kind: 'error', message: data.error || '重新分类失败' });
      }
    } catch {
      setStatus({ kind: 'error', message: '重新分类失败' });
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <AdminPageHeader eyebrow="CATALOG" title="分类管理" />

      {status && (
        <div role="status" aria-live="polite" style={{
          padding: '8px 16px',
          borderRadius: '4px',
          marginBottom: '16px',
          background: status.kind === 'success' ? '#e8f5e9' : '#ffebee',
          color: status.kind === 'success' ? '#2e7d32' : '#c62828'
        }}>
          {status.message}
        </div>
      )}

      <section className={styles.panel} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>分类结构</h2>
          <button
            onClick={() => { setShowAddForm(true); setParentId(null); }}
            className={styles.button}
          >
            + 新建顶级分类
          </button>
        </div>
        {categories.length === 0 ? (
          <p>暂无分类。<button className={styles.button} onClick={() => void fetchData()}>刷新</button></p>
        ) : (
          <CategoryTree
            categories={categories}
            onEdit={setEditingCategory}
            onDelete={handleDeleteCategory}
            onAddChild={(pid) => { setShowAddForm(true); setParentId(pid); }}
          />
        )}
      </section>

      <section className={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>分类映射</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label htmlFor="source-select">来源筛选：</label>
            <select
              id="source-select"
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              style={{ padding: '4px 8px' }}
            >
              <option value="">全部来源</option>
              {sources.map(source => (
                <option key={source.sourceKey} value={source.sourceKey}>{source.name}</option>
              ))}
            </select>
            {selectedSource && (
              <button className={styles.button} onClick={handleReclassify}>
                重新分类已采集影片
              </button>
            )}
          </div>
        </div>
        {mappings.length === 0 ? (
          <p>{selectedSource ? '该来源暂无分类映射' : '暂无分类映射，请先采集数据'}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>采集源</th>
                <th>源分类</th>
                <th>状态</th>
                <th>本地分类</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(mapping => (
                <tr key={mapping.id}>
                  <td>{mapping.sourceKey}</td>
                  <td>{mapping.sourceTypeName} (ID: {mapping.sourceTypeId})</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: mapping.status === 'MAPPED' ? '#4caf50' : mapping.status === 'IGNORED' ? '#999' : '#ff9800',
                      color: '#fff'
                    }}>
                      {mapping.status === 'MAPPED' ? '已映射' : mapping.status === 'IGNORED' ? '已忽略' : '待审核'}
                    </span>
                    {mapping.isAuto && ' (自动)'}
                  </td>
                  <td>
                    {mapping.status === 'IGNORED' ? '-' : findLocalCategoryName(mapping.localCategoryId)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {mapping.status !== 'IGNORED' && (
                        <select
                          value={mapping.localCategoryId || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val > 0) handleUpdateMapping(mapping.id, 'MAPPED', val);
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <option value="">更改分类...</option>
                          {categories.map(cat => (
                            <optgroup key={cat.id} label={cat.name}>
                              <option value={cat.id}>{cat.name}</option>
                              {cat.children?.map(child => (
                                <option key={child.id} value={child.id}>  └ {child.name}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => handleUpdateMapping(mapping.id, 'IGNORED')}
                        style={{ padding: '2px 8px', fontSize: '12px', color: mapping.status === 'IGNORED' ? '#999' : '#f44' }}
                        disabled={mapping.status === 'IGNORED'}
                      >
                        {mapping.status === 'IGNORED' ? '已忽略' : '忽略'}
                      </button>
                      {mapping.status !== 'MAPPED' && mapping.localCategoryId && (
                        <button
                          onClick={() => handleUpdateMapping(mapping.id, 'MAPPED', mapping.localCategoryId!)}
                          style={{ padding: '2px 8px', fontSize: '12px', color: '#4caf50' }}
                        >
                          恢复映射
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showAddForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', minWidth: '400px' }}>
            <h3>{parentId ? '添加子分类' : '添加顶级分类'}</h3>
            <form onSubmit={handleAddCategory}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>分类名称</label>
                <input type="text" name="name" required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Slug</label>
                <input type="text" name="slug" required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowAddForm(false); setParentId(null); }} style={{ padding: '8px 16px' }}>取消</button>
                <button type="submit" className={styles.button}>创建</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCategory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', minWidth: '400px' }}>
            <h3>编辑分类</h3>
            <form onSubmit={handleEditCategory}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>分类名称</label>
                <input type="text" name="name" defaultValue={editingCategory.name} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Slug</label>
                <input type="text" name="slug" defaultValue={editingCategory.slug} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditingCategory(null)} style={{ padding: '8px 16px' }}>取消</button>
                <button type="submit" className={styles.button}>更新</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
