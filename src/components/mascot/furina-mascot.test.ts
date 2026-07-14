import { describe, expect, it } from 'vitest';
import { clampMascotPosition, DEFAULT_MASCOT_POSITION, FURINA_DIALOGUES, isMascotSuppressed, loadMascotPosition, parseMascotPosition, saveMascotPosition, shouldActivateMascotClick } from './furina-mascot';

describe('Furina mascot contracts', () => {
  it('contains the exact ten approved stage-proud dialogue lines', () => {
    expect(FURINA_DIALOGUES).toEqual([
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
    ]);
  });

  it('clamps a saved position to the visible viewport', () => {
    expect(clampMascotPosition({ x: 900, y: -20 }, { width: 600, height: 500 }, { width: 150, height: 190 }))
      .toEqual({ x: 450, y: 0 });
  });

  it('returns the default position for malformed saved coordinates', () => {
    expect(parseMascotPosition('{"x":"nope"}')).toEqual(DEFAULT_MASCOT_POSITION);
  });

  it('suppresses the mascot for forms and focused editable controls', () => {
    expect(isMascotSuppressed('/login', false)).toBe(true);
    expect(isMascotSuppressed('/register', false)).toBe(true);
    expect(isMascotSuppressed('/user/profile', false)).toBe(true);
    expect(isMascotSuppressed('/movies', true)).toBe(true);
    expect(isMascotSuppressed('/', false)).toBe(false);
  });

  it('falls back safely when browser storage is unavailable', () => {
    expect(loadMascotPosition(() => { throw new Error('storage blocked'); })).toEqual(DEFAULT_MASCOT_POSITION);
    expect(() => saveMascotPosition(() => { throw new Error('storage blocked'); }, { x: 12, y: 24 })).not.toThrow();
  });

  it('allows keyboard clicks without retaining a stale pointer suppression flag', () => {
    expect(shouldActivateMascotClick(0)).toBe(true);
    expect(shouldActivateMascotClick(1)).toBe(false);
    expect(shouldActivateMascotClick(2)).toBe(false);
  });
});
