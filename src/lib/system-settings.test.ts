import { describe, expect, it, vi, beforeEach } from 'vitest';

const state = new Map<string, string>();

vi.mock('./prisma', () => ({
  default: {
    systemSetting: {
      findMany: vi.fn(async () => Array.from(state.entries()).map(([key, value]) => ({ key, value }))),
      upsert: vi.fn(async ({ where, create, update }) => {
        state.set(where.key, update?.value ?? create.value);
        return { key: where.key, value: state.get(where.key) };
      }),
    },
    $transaction: vi.fn(async (operations) => Promise.all(operations)),
  },
}));

describe('system settings', () => {
  beforeEach(() => {
    state.clear();
  });

  it('does not expose plaintext AI API key in admin settings', async () => {
    const { getAdminSystemSettings, systemSettingKeys } = await import('./system-settings');
    state.set(systemSettingKeys.aiApiKey, 'secret-key');

    const settings = await getAdminSystemSettings();

    expect(settings.aiApiKeyConfigured).toBe(true);
    expect(settings).not.toHaveProperty('aiApiKey');
  });

  it('keeps existing API key when saving blank value', async () => {
    const { saveAdminSystemSettings, systemSettingKeys } = await import('./system-settings');
    state.set(systemSettingKeys.aiApiKey, 'old-secret');

    await saveAdminSystemSettings({ aiApiKey: '   ', siteName: '电影站' });

    expect(state.get(systemSettingKeys.aiApiKey)).toBe('old-secret');
    expect(state.get(systemSettingKeys.siteName)).toBe('电影站');
  });

  it('normalizes unsafe logo URLs to blank values', async () => {
    const { saveAdminSystemSettings, systemSettingKeys } = await import('./system-settings');

    await saveAdminSystemSettings({ siteLogoUrl: 'javascript:alert(1)', siteFaviconUrl: 'https://example.com/favicon.ico' });

    expect(state.get(systemSettingKeys.siteLogoUrl)).toBe('');
    expect(state.get(systemSettingKeys.siteFaviconUrl)).toBe('https://example.com/favicon.ico');
  });

  it('reports configured API key after saving a new key', async () => {
    const { saveAdminSystemSettings, getAdminSystemSettings } = await import('./system-settings');

    await saveAdminSystemSettings({ aiApiKey: 'new-secret' });

    const settings = await getAdminSystemSettings();
    expect(settings.aiApiKeyConfigured).toBe(true);
  });
});
