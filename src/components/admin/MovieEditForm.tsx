'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

interface MovieEditFormProps {
  movie?: {
    id: number;
    title: string;
    typeId: number;
    director: string | null;
    actors: string | null;
    description: string | null;
    year: number | null;
    area: string | null;
    language: string | null;
    picUrl: string | null;
    score: unknown;
  };
  categories: Array<{ id: number; name: string }>;
}

export default function MovieEditForm({ movie, categories }: MovieEditFormProps) {
  const router = useRouter();
  const isEditing = Boolean(movie);
  const [formData, setFormData] = useState({
    title: movie?.title || '',
    typeId: movie?.typeId?.toString() || '',
    director: movie?.director || '',
    actors: movie?.actors || '',
    description: movie?.description || '',
    year: movie?.year?.toString() || '',
    area: movie?.area || '',
    language: movie?.language || '',
    picUrl: movie?.picUrl || '',
    score: movie?.score?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(isEditing ? `/api/admin/movies/${movie!.id}` : '/api/admin/movies', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(isEditing ? '保存影片失败' : '新增影片失败');
      }

      router.push('/admin/movies');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!movie) return;
    if (!confirm('确定要删除这部影片吗？')) return;

    try {
      const response = await fetch(`/api/admin/movies/${movie.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除影片失败');
      }

      router.push('/admin/movies');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className={styles.stack}>
      <h2>{isEditing ? '编辑影片' : '新增影片'}</h2>

      {error && (
        <div className={`${styles.message} ${styles.dangerText}`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>
            标题 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label>
            分类
          </label>
          <select
            value={formData.typeId}
            onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
            className={styles.select}
          >
            <option value="">选择分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

          <div className={styles.field}>
            <label>
              导演
            </label>
            <input
              type="text"
              value={formData.director}
              onChange={(e) => setFormData({ ...formData, director: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>
              年份
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>
              地区
            </label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label>
              语言
            </label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className={styles.input}
            />
          </div>

        <div className={styles.field}>
          <label>
            评分
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>
            海报 URL
          </label>
          <input
            type="url"
            value={formData.picUrl}
            onChange={(e) => setFormData({ ...formData, picUrl: e.target.value })}
            className={styles.input}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>
            演员
          </label>
          <textarea
            value={formData.actors}
            onChange={(e) => setFormData({ ...formData, actors: e.target.value })}
            rows={3}
            className={styles.textarea}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label>
            简介
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
            className={styles.textarea}
          />
        </div>

        <div className={`${styles.actions} ${styles.fullWidth}`}>
          <button
            type="submit"
            disabled={loading}
            className={styles.button}
          >
            {loading ? '保存中...' : '保存'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className={styles.buttonDanger}
            >
              删除
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push('/admin/movies')}
            className={styles.buttonGhost}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
