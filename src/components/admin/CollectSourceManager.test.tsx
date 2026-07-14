// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/admin/admin.module.css', () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import CollectSourceManager from './CollectSourceManager';

const source = {
  id: 1,
  name: '量子',
  apiUrl: 'https://api.qz.example/provide/vod/',
  sourceKey: 'qz',
  format: 'JSON',
  isActive: true,
  lastSync: null,
};

const task = {
  id: 'task-1',
  sourceKey: 'qz',
  mode: 'full',
  status: 'RUNNING',
  totalPages: 5,
  pagesProcessed: 2,
  fetched: 40,
  saved: 38,
  errorMessage: null,
  createdAt: '2026-07-14T00:00:00.000Z',
  finishedAt: null,
};

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response;
}

function mockFetch(overrides: Partial<Record<string, () => Promise<Response>>> = {}) {
  return vi.fn((url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    if (overrides[key]) return overrides[key]();
    if (url === '/api/collect/sources') return Promise.resolve(jsonResponse({ success: true, data: [source] }));
    if (url === '/api/collect/tasks') return Promise.resolve(jsonResponse({ success: true, data: [] }));
    return Promise.resolve(jsonResponse({ success: false, error: '未预期的请求' }, false));
  });
}

async function renderManager() {
  render(<CollectSourceManager />);
  await screen.findByRole('button', { name: '首批 100 条' });
}

describe('CollectSourceManager', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('disables save and announces the returned source immediately', async () => {
    let resolveCreate: ((response: Response) => void) | undefined;
    const fetch = mockFetch({
      'POST /api/collect/sources': () => new Promise((resolve) => { resolveCreate = resolve; }),
    });
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();

    await renderManager();
    await user.type(screen.getByPlaceholderText('来源名称'), '量子');
    await user.type(screen.getByPlaceholderText('唯一标识（可留空自动生成）'), 'qz');
    await user.type(screen.getByPlaceholderText('AppleCMS API 地址'), source.apiUrl);
    await user.click(screen.getByRole('button', { name: '保存采集源' }));

    expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
    resolveCreate?.(jsonResponse({ success: true, data: source }));
    expect(await screen.findByRole('status')).toHaveTextContent('已新增采集源：量子');
  });

  it('derives a source key only until the user edits it', async () => {
    vi.stubGlobal('fetch', mockFetch());
    const user = userEvent.setup();

    await renderManager();
    const apiUrl = screen.getByPlaceholderText('AppleCMS API 地址');
    const sourceKey = screen.getByPlaceholderText('唯一标识（可留空自动生成）');
    await user.type(apiUrl, 'https://api.qzzy.example/provide/vod/');
    await user.tab();
    expect(sourceKey).toHaveValue('api-qzzy-example-provide-vod');

    await user.clear(sourceKey);
    await user.type(sourceKey, 'custom-key');
    await user.clear(apiUrl);
    await user.type(apiUrl, 'https://other.example/api');
    await user.tab();
    expect(sourceKey).toHaveValue('custom-key');
  });

  it('retains source form values after a failed save', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'POST /api/collect/sources': async () => jsonResponse({ success: false, error: '保存失败' }, false),
    }));
    const user = userEvent.setup();

    await renderManager();
    await user.type(screen.getByPlaceholderText('来源名称'), '量子');
    await user.type(screen.getByPlaceholderText('唯一标识（可留空自动生成）'), 'qz');
    await user.type(screen.getByPlaceholderText('AppleCMS API 地址'), source.apiUrl);
    await user.click(screen.getByRole('button', { name: '保存采集源' }));

    expect(await screen.findByRole('status')).toHaveTextContent('保存失败');
    expect(screen.getByPlaceholderText('来源名称')).toHaveValue('量子');
    expect(screen.getByPlaceholderText('唯一标识（可留空自动生成）')).toHaveValue('qz');
    expect(screen.getByPlaceholderText('AppleCMS API 地址')).toHaveValue(source.apiUrl);
  });

  it('creates a full task without waiting for collection completion', async () => {
    const fetch = mockFetch({
      'POST /api/collect/tasks': async () => jsonResponse({ success: true, data: task }),
    });
    vi.stubGlobal('fetch', fetch);
    const user = userEvent.setup();

    await renderManager();
    await user.click(screen.getByRole('button', { name: '全量采集' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/collect/tasks', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sourceKey: 'qz', mode: 'full' }),
    })));
    expect(await screen.findByText('运行中')).toBeInTheDocument();
  });

  it('renders active task controls for a running task', async () => {
    const fetch = mockFetch({
      'GET /api/collect/tasks': async () => jsonResponse({ success: true, data: [task] }),
      'PATCH /api/collect/tasks/task-1': async () => jsonResponse({ success: true, data: { ...task, status: 'PAUSED' } }),
    });
    vi.stubGlobal('fetch', fetch);

    render(<CollectSourceManager />);
    expect(await screen.findByRole('button', { name: '暂停' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '暂停' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/collect/tasks/task-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ action: 'pause' }),
    })));

    expect(await screen.findByRole('button', { name: '继续' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });
});
