export function validateUserProfileUpdate(body: Record<string, unknown>) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!username || username.length > 50) return { error: '用户名无效' } as const;
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 255) return { error: '邮箱无效' } as const;
  return { username, email } as const;
}

export function validateUserPasswordChange(body: Record<string, unknown>) {
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!currentPassword) return { error: '请输入当前密码' } as const;
  if (newPassword.length < 6) return { error: '新密码至少6位' } as const;
  return { currentPassword, newPassword } as const;
}
