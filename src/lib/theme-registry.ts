import prisma from './prisma';

const DEFAULT_THEME_KEY = 'ice-blue';

// 内置主题列表
export const BUILT_IN_THEMES = ['ice-blue', 'azure'] as const;
export type BuiltInTheme = typeof BUILT_IN_THEMES[number];

export function isBuiltInTheme(key: string): key is BuiltInTheme {
  return BUILT_IN_THEMES.includes(key as BuiltInTheme);
}

export async function getActiveThemeKey() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'active_theme' },
    select: { value: true },
  });

  return setting?.value || DEFAULT_THEME_KEY;
}
