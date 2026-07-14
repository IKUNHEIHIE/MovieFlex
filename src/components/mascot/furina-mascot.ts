export const FURINA_DIALOGUES = [
  '安静些，精彩演出要开始了。',
  '能被本小姐选中，可是你的荣幸。',
  '灯光就位，下一幕由你决定！',
  '别只顾着发呆，快挑一部好看的。',
  '掌声呢？我可是精心准备了开场。',
  '剧情再精彩，也别忘了眨眨眼。',
  '这份推荐，出自舞台最耀眼的主角。',
  '幕布拉开以后，就不许中途退场喔。',
  '今日的欢愉，也该轮到你了。',
  '谢幕之前，再陪我看一会儿吧。',
] as const;

export const DEFAULT_MASCOT_POSITION = { x: -20, y: -20 };

export type MascotPosition = { x: number; y: number };
export type MascotBounds = { width: number; height: number };

export function isMascotSuppressed(pathname: string, hasFocusedEditable: boolean): boolean {
  return hasFocusedEditable || ['/admin', '/dashboard', '/movie/', '/login', '/register', '/user/'].some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix));
}

export function clampMascotPosition(position: MascotPosition, viewport: MascotBounds, mascot: MascotBounds): MascotPosition {
  return {
    x: Math.min(Math.max(position.x, 0), Math.max(viewport.width - mascot.width, 0)),
    y: Math.min(Math.max(position.y, 0), Math.max(viewport.height - mascot.height, 0)),
  };
}

export function parseMascotPosition(value: string | null): MascotPosition {
  if (!value) return DEFAULT_MASCOT_POSITION;
  try {
    const parsed = JSON.parse(value) as Partial<MascotPosition>;
    if (typeof parsed.x === 'number' && Number.isFinite(parsed.x) && typeof parsed.y === 'number' && Number.isFinite(parsed.y)) return { x: parsed.x, y: parsed.y };
  } catch { /* fall through */ }
  return DEFAULT_MASCOT_POSITION;
}

export function loadMascotPosition(read: () => string | null): MascotPosition {
  try { return parseMascotPosition(read()); } catch { return DEFAULT_MASCOT_POSITION; }
}

export function saveMascotPosition(write: (value: string) => void, position: MascotPosition): void {
  try { write(JSON.stringify(position)); } catch { /* storage is optional */ }
}

export function shouldActivateMascotClick(detail: number): boolean {
  return detail === 0;
}
