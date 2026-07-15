'use client';

import { useEffect, useState } from 'react';
import styles from '../../admin.module.css';

interface MovieStat {
  id: number;
  title: string;
  viewCount: number;
  favoriteCount: number;
  avgProgress: number;
  typeName: string | null;
}

export default function MoviesStatsPage() {
  const [movies, setMovies] = useState<MovieStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('viewCount');
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchMovies();
  }, [sort, category]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (category) params.set('category', category);
      const res = await fetch(`/api/admin/stats/movies?${params}`);
      const data = await res.json();
      if (data.success) {
        setMovies(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>影片热度排行</h1>

      <div className={styles.filters}>
        <div>
          <label>排序方式：</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="viewCount">观看次数</option>
            <option value="favoriteCount">收藏数</option>
            <option value="avgProgress">平均进度</option>
          </select>
        </div>
        <div>
          <label>分类筛选：</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">全部分类</option>
            <option value="1">动作片</option>
            <option value="2">喜剧片</option>
            <option value="3">爱情片</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>排名</th>
              <th>影片名称</th>
              <th>分类</th>
              <th>观看次数</th>
              <th>收藏数</th>
              <th>平均进度</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((movie, index) => (
              <tr key={movie.id}>
                <td>{index + 1}</td>
                <td>{movie.title}</td>
                <td>{movie.typeName || '-'}</td>
                <td>{movie.viewCount}</td>
                <td>{movie.favoriteCount}</td>
                <td>{(movie.avgProgress * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
