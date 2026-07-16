import prisma from './prisma';

export type PublicSystemSettings = {
  siteName: string;
  siteSlogan: string;
  siteDescription: string;
  siteLogoUrl: string;
  siteFaviconUrl: string;
};

export type AdminSystemSettings = PublicSystemSettings & {
  aiBaseUrl: string;
  aiModelId: string;
  aiApiKeyConfigured: boolean;
};

export type AdminSystemSettingsInput = Partial<PublicSystemSettings> & {
  aiBaseUrl?: string;
  aiModelId?: string;
  aiApiKey?: string;
};

export type AiProviderSettings = {
  baseUrl: string;
  modelId: string;
  apiKey: string;
};

const DEFAULT_PUBLIC_SETTINGS: PublicSystemSettings = {
  siteName: 'MovieFlex',
  siteSlogan: '让好电影主动找到你',
  siteDescription: 'MovieFlex 是一个支持采集、推荐、统计和 AI 助手的影视平台。',
  siteLogoUrl: '',
  siteFaviconUrl: '/favicon.ico',
};

const SETTING_KEYS = {
  siteName: 'site_name',
  siteSlogan: 'site_slogan',
  siteDescription: 'site_description',
  siteLogoUrl: 'site_logo_url',
  siteFaviconUrl: 'site_favicon_url',
  aiBaseUrl: 'ai_base_url',
  aiApiKey: 'ai_api_key',
  aiModelId: 'ai_model_id',
} as const;

const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_AI_MODEL_ID = 'gpt-4o-mini';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUrl(value: unknown): string {
  const text = normalizeText(value);
  if (!text) return '';
  if (text.startsWith('/') || text.startsWith('http://') || text.startsWith('https://')) {
    return text;
  }
  return '';
}

function mapSettings(records: { key: string; value: string }[]) {
  return new Map(records.map((record) => [record.key, record.value]));
}

async function getSettingsMap() {
  const records = await prisma.systemSetting.findMany();
  return mapSettings(records);
}

export async function getPublicSystemSettings(): Promise<PublicSystemSettings> {
  const settings = await getSettingsMap();

  return {
    siteName: settings.get(SETTING_KEYS.siteName) || DEFAULT_PUBLIC_SETTINGS.siteName,
    siteSlogan: settings.get(SETTING_KEYS.siteSlogan) || DEFAULT_PUBLIC_SETTINGS.siteSlogan,
    siteDescription: settings.get(SETTING_KEYS.siteDescription) || DEFAULT_PUBLIC_SETTINGS.siteDescription,
    siteLogoUrl: settings.get(SETTING_KEYS.siteLogoUrl) || DEFAULT_PUBLIC_SETTINGS.siteLogoUrl,
    siteFaviconUrl: settings.get(SETTING_KEYS.siteFaviconUrl) || DEFAULT_PUBLIC_SETTINGS.siteFaviconUrl,
  };
}

export async function getAdminSystemSettings(): Promise<AdminSystemSettings> {
  const settings = await getSettingsMap();
  const publicSettings = await getPublicSystemSettings();
  const apiKey = settings.get(SETTING_KEYS.aiApiKey) || '';

  return {
    ...publicSettings,
    aiBaseUrl: settings.get(SETTING_KEYS.aiBaseUrl) || DEFAULT_AI_BASE_URL,
    aiModelId: settings.get(SETTING_KEYS.aiModelId) || DEFAULT_AI_MODEL_ID,
    aiApiKeyConfigured: apiKey.length > 0,
  };
}

async function upsertSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function saveAdminSystemSettings(input: AdminSystemSettingsInput): Promise<void> {
  const updates: Array<[string, string]> = [
    [SETTING_KEYS.siteName, normalizeText(input.siteName) || DEFAULT_PUBLIC_SETTINGS.siteName],
    [SETTING_KEYS.siteSlogan, normalizeText(input.siteSlogan)],
    [SETTING_KEYS.siteDescription, normalizeText(input.siteDescription)],
    [SETTING_KEYS.siteLogoUrl, normalizeUrl(input.siteLogoUrl)],
    [SETTING_KEYS.siteFaviconUrl, normalizeUrl(input.siteFaviconUrl) || DEFAULT_PUBLIC_SETTINGS.siteFaviconUrl],
    [SETTING_KEYS.aiBaseUrl, normalizeUrl(input.aiBaseUrl) || DEFAULT_AI_BASE_URL],
    [SETTING_KEYS.aiModelId, normalizeText(input.aiModelId) || DEFAULT_AI_MODEL_ID],
  ];

  const apiKey = normalizeText(input.aiApiKey);
  if (apiKey) updates.push([SETTING_KEYS.aiApiKey, apiKey]);

  await prisma.$transaction(updates.map(([key, value]) => prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })));
}

export async function getAiProviderSettings(): Promise<AiProviderSettings | null> {
  const settings = await getSettingsMap();
  const apiKey = settings.get(SETTING_KEYS.aiApiKey) || '';
  if (!apiKey) return null;

  return {
    baseUrl: settings.get(SETTING_KEYS.aiBaseUrl) || DEFAULT_AI_BASE_URL,
    modelId: settings.get(SETTING_KEYS.aiModelId) || DEFAULT_AI_MODEL_ID,
    apiKey,
  };
}

export const systemSettingKeys = SETTING_KEYS;
