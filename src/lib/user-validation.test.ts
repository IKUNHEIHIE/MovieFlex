import { describe, expect, it } from 'vitest';
import { validateUserProfileUpdate, validateUserPasswordChange } from './user-validation';

describe('user profile validation', () => {
  it('accepts valid profile changes', () => {
    expect(validateUserProfileUpdate({ username: 'movie_fan', email: 'fan@example.com' })).toEqual({ username: 'movie_fan', email: 'fan@example.com' });
  });

  it('rejects a weak password change', () => {
    expect(validateUserPasswordChange({ currentPassword: 'old', newPassword: 'short' })).toEqual({ error: '新密码至少6位' });
  });
});
