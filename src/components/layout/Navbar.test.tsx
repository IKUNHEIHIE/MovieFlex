// @vitest-environment jsdom

import { afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

afterEach(() => cleanup());

describe('Navbar', () => {
  it('shows profile and account management without standalone activity links', async () => {
    const user = userEvent.setup();
    render(<Navbar settings={{ siteName: 'MovieFlex', siteLogoUrl: '' }} />);

    await user.click(screen.getByRole('button', { name: /我的/ }));

    expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/user/profile');
    expect(screen.getByRole('link', { name: '账号管理' })).toHaveAttribute('href', '/user/account');
    expect(screen.queryByRole('link', { name: '我的收藏' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '观看历史' })).not.toBeInTheDocument();
  });

  it('renders configured logo image and keeps text fallback when logo is blank', () => {
    const { rerender } = render(<Navbar settings={{ siteName: '海棠影院', siteLogoUrl: 'https://example.com/logo.png' }} />);

    expect(screen.getByRole('link', { name: '海棠影院 首页' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: '海棠影院' })).toHaveAttribute('src', 'https://example.com/logo.png');

    rerender(<Navbar settings={{ siteName: 'MovieFlex', siteLogoUrl: '' }} />);
    expect(screen.getByRole('link', { name: 'MovieFlex 首页' })).toHaveTextContent('MovieFlex');
  });
});
