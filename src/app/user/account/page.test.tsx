// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { profileSettings } = vi.hoisted(() => ({ profileSettings: vi.fn(() => <div>账号表单</div>) }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn(async () => ({ user: { username: 'alice', email: 'alice@example.com' } })) }));
vi.mock('@/components/user/ProfileSettings', () => ({ default: profileSettings }));

import AccountPage from './page';

describe('AccountPage', () => {
  it('renders account management with the current user details', async () => {
    render(await AccountPage());

    expect(screen.getByRole('heading', { name: '账号管理' })).toBeInTheDocument();
    expect(profileSettings).toHaveBeenCalledWith({ username: 'alice', email: 'alice@example.com' }, undefined);
  });
});
