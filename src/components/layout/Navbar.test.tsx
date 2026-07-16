// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: { role: 'USER' } }, status: 'authenticated' }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import Navbar from './Navbar';

describe('Navbar', () => {
  it('shows profile and account management without standalone activity links', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole('button', { name: /我的/ }));

    expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/user/profile');
    expect(screen.getByRole('link', { name: '账号管理' })).toHaveAttribute('href', '/user/account');
    expect(screen.queryByRole('link', { name: '我的收藏' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '观看历史' })).not.toBeInTheDocument();
  });
});
