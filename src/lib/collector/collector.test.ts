import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({ default: {} }));

import { collectPage } from './collector';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('requests exactly the requested AppleCMS detail page', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: vi.fn().mockResolvedValue(JSON.stringify({ list: [] })),
  });
  vi.stubGlobal('fetch', fetch);

  await collectPage({
    sourceKey: 'qz',
    apiUrl: 'https://api.example/provide/vod',
    format: 'JSON',
    page: 3,
  });

  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ac=detail'), expect.any(Object));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pg=3'), expect.any(Object));
});

it('includes the recent-hours filter when requested', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: vi.fn().mockResolvedValue(JSON.stringify({ list: [] })),
  });
  vi.stubGlobal('fetch', fetch);

  await collectPage({
    sourceKey: 'qz',
    apiUrl: 'https://api.example/provide/vod',
    format: 'JSON',
    page: 3,
    recentHours: 24,
  });

  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('h=24'), expect.any(Object));
});

it('omits the recent-hours filter when not requested', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: vi.fn().mockResolvedValue(JSON.stringify({ list: [] })),
  });
  vi.stubGlobal('fetch', fetch);

  await collectPage({
    sourceKey: 'qz',
    apiUrl: 'https://api.example/provide/vod',
    format: 'JSON',
    page: 3,
  });

  const requestUrl = fetch.mock.calls[0][0] as string;
  expect(new URL(requestUrl).searchParams.has('h')).toBe(false);
});
