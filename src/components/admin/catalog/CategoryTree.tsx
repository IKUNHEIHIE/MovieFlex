'use client';

import { useState } from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  movieCount?: number;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onAddChild?: (parentId: number) => void;
}

export default function CategoryTree({ categories, onEdit, onDelete, onAddChild }: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="category-tree">
      {categories.map(category => (
        <div key={category.id} className="category-item">
          <div className="category-parent" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '4px' }}>
            <button
              onClick={() => toggleExpand(category.id)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '12px' }}
            >
              {expanded.has(category.id) ? '▼' : '▶'}
            </button>
            <strong style={{ flex: 1 }}>{category.name}</strong>
            <span style={{ color: '#666', fontSize: '12px' }}>
              {category.movieCount || 0} 部影片
            </span>
            <span style={{ color: '#999', fontSize: '12px' }}>
              slug: {category.slug}
            </span>
            {onAddChild && (
              <button
                onClick={() => onAddChild(category.id)}
                style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '12px' }}
              >
                + 子分类
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(category)}
                style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '12px' }}
              >
                编辑
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(category)}
                style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '12px', color: '#f44' }}
              >
                删除
              </button>
            )}
          </div>
          
          {expanded.has(category.id) && category.children && category.children.length > 0 && (
            <div style={{ marginLeft: '24px', marginTop: '4px' }}>
              {category.children.map(child => (
                <div
                  key={child.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: '#fff', borderRadius: '4px', marginBottom: '2px', border: '1px solid #eee' }}
                >
                  <span style={{ flex: 1 }}>{child.name}</span>
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {child.movieCount || 0} 部影片
                  </span>
                  <span style={{ color: '#999', fontSize: '12px' }}>
                    slug: {child.slug}
                  </span>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(child)}
                      style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '12px' }}
                    >
                      编辑
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(child)}
                      style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '12px', color: '#f44' }}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
