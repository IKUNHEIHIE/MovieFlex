import prisma from './prisma';

const DEFAULT_THEME_KEY = 'ice-blue';

export async function getActiveThemeKey() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'active_theme' },
    select: { value: true },
  });

  return setting?.value || DEFAULT_THEME_KEY;
}
