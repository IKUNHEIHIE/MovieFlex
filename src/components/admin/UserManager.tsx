'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from '@/app/admin/admin.module.css';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  favoritesCount: number;
  watchHistoryCount: number;
  createdAt: string;
}

interface UserManagerProps {
  initialUsers: User[];
  totalCount: number;
}

export default function UserManager({ initialUsers, totalCount }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalUsers, setTotalUsers] = useState(totalCount);

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const currentPage = Math.min(page, totalPages);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
    if (search.trim()) params.set('search', search.trim());
    const response = await fetch(`/api/admin/users?${params}`);
    const data = await response.json();
    if (data.success) {
      setUsers(data.data.users);
      setTotalUsers(data.data.total);
    }
  }, [currentPage, pageSize, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const create = async (form: FormData) => {
    const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    setMessage(data.success ? '用户已创建，刷新页面查看。' : data.error);
    if (data.success) fetchUsers();
  };

  const update = async (user: User) => {
    const username = window.prompt('用户名', user.username); if (username === null) return;
    const email = window.prompt('邮箱', user.email); if (email === null) return;
    const password = window.prompt('新密码（留空则不修改）', ''); if (password === null) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, role: user.role }) });
    const data = await response.json();
    setMessage(data.success ? '用户资料已更新，刷新页面查看。' : data.error);
    if (data.success) fetchUsers();
  };

  const remove = async (id: number, username: string) => {
    if (window.prompt(`输入用户名 ${username} 以确认删除`) !== username) return;
    const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmUsername: username }) });
    const data = await response.json();
    setMessage(data.success ? '用户已删除，刷新页面查看。' : data.error);
    if (data.success) fetchUsers();
  };

  const toggleRole = async (id: number, currentRole: 'USER' | 'ADMIN') => {
    const next = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: next }) });
    const data = await response.json();
    setMessage(data.success ? '角色已更新，刷新页面查看。' : data.error);
    if (data.success) fetchUsers();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div className={styles.pageStack}>
      <form action={async (form) => create(form)} className={styles.toolbar}>
        <input className={styles.input} name="username" placeholder="用户名" required />
        <input className={styles.input} name="email" type="email" placeholder="邮箱" required />
        <input className={styles.input} name="password" type="password" placeholder="初始密码" minLength={6} required />
        <select className={styles.select} name="role"><option value="USER">用户</option><option value="ADMIN">管理员</option></select>
        <button className={styles.button}>新增用户</button>
      </form>
      {message && <p className={styles.message}>{message}</p>}

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input className={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索用户名或邮箱" />
        <button className={styles.buttonSecondary} type="submit">搜索</button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>收藏</th>
              <th>观看记录</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role === 'ADMIN' ? '管理员' : '用户'}</td>
                <td>{user.favoritesCount}</td>
                <td>{user.watchHistoryCount}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className={styles.tableActions}>
                    <button className={styles.buttonSecondary} onClick={() => update(user)}>编辑</button>
                    <button className={styles.buttonSecondary} onClick={() => toggleRole(user.id, user.role)}>
                      {user.role === 'ADMIN' ? '降为用户' : '设为管理员'}
                    </button>
                    <button className={styles.buttonDanger} onClick={() => remove(user.id, user.username)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.field}>
          <label>每页显示: </label>
          <select className={styles.select} value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.buttonSecondary} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
          <span>第 {currentPage} / {totalPages} 页，共 {totalUsers} 个用户</span>
          <button className={styles.buttonSecondary} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
        </div>
      </div>
    </div>
  );
}
