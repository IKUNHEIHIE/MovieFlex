'use client';

import { useEffect, useState } from 'react';
import styles from '../../admin.module.css';

interface UserStat {
  id: number;
  username: string;
  watchCount: number;
  uniqueMovies: number;
  favoriteCount: number;
  avgProgress: number;
  activityLevel: string;
}

export default function UsersStatsPage() {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityLabel = (level: string) => {
    switch (level) {
      case 'high':
        return '🔥 高活跃';
      case 'medium':
        return '⭐ 中活跃';
      default:
        return '💤 低活跃';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>用户行为统计</h1>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>用户名</th>
              <th>观看次数</th>
              <th>观看影片数</th>
              <th>收藏数</th>
              <th>平均进度</th>
              <th>活跃度</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.watchCount}</td>
                <td>{user.uniqueMovies}</td>
                <td>{user.favoriteCount}</td>
                <td>{(user.avgProgress * 100).toFixed(1)}%</td>
                <td>{getActivityLabel(user.activityLevel)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
