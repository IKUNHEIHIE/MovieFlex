import { describe, expect, it } from 'vitest';
import {
  buildResolverUrl,
  isSafePlaybackUrl,
  parsePlayGroups,
  playersFromSourceConfig,
  selectPlayback,
  DEFAULT_PLAYERS,
  type RegistryPlayer,
} from './playback';

const players: RegistryPlayer[] = [
  { code: 'liangzi', name: '量子云', mode: 'IFRAME_DIRECT', isEnabled: true, resolverUrl: null },
  { code: 'lzm3u8', name: '量子 m3u8', mode: 'IFRAME_RESOLVER', isEnabled: true, resolverUrl: 'https://lziplayer.com/?url=' },
  { code: 'closed', name: '已停用', mode: 'HLS', isEnabled: false, resolverUrl: null },
];

describe('CMS playback parser', () => {
  it('uses an iframe for the production liangzi share provider', () => {
    const { selection } = selectPlayback(
      parsePlayGroups('liangzi', '正片$https://v.example/share/abc'),
      DEFAULT_PLAYERS,
    );

    expect(selection?.player.mode).toBe('IFRAME_DIRECT');
  });
  it('pairs $$$ sources with their own episodes and preserves source/episode indices', () => {
    expect(parsePlayGroups(
      'liangzi$$$lzm3u8$$$closed',
      '第1集$https://share.example/one#第2集$https://share.example/two$$$正片$https://media.example/video.m3u8$$$第1集$https://closed.example/video',
    )).toEqual([
      { source: 0, code: 'liangzi', episodes: [
        { ep: 0, name: '第1集', url: 'https://share.example/one' },
        { ep: 1, name: '第2集', url: 'https://share.example/two' },
      ] },
      { source: 1, code: 'lzm3u8', episodes: [{ ep: 0, name: '正片', url: 'https://media.example/video.m3u8' }] },
      { source: 2, code: 'closed', episodes: [{ ep: 0, name: '第1集', url: 'https://closed.example/video' }] },
    ]);
  });

  it('removes unavailable or malformed episode values without renumbering later episodes', () => {
    expect(parsePlayGroups('liangzi', '第1集$no#第2集$#第3集$https://ok.example/three#https://ok.example/four')).toEqual([
      { source: 0, code: 'liangzi', episodes: [
        { ep: 2, name: '第3集', url: 'https://ok.example/three' },
        { ep: 3, name: '第4集', url: 'https://ok.example/four' },
      ] },
    ]);
  });

  it('uses play-url line count, trims usable URL whitespace, and does not invent unmatched source groups', () => {
    expect(parsePlayGroups(' liangzi $$$ lzm3u8 ', ' 第一集 $ https://share.example/one #   $$$第二集$   ')).toEqual([
      { source: 0, code: 'liangzi', episodes: [{ ep: 0, name: '第一集', url: 'https://share.example/one' }] },
      { source: 1, code: 'lzm3u8', episodes: [] },
    ]);
    expect(parsePlayGroups('liangzi', '第一集$https://share.example/one$$$第二集$https://unknown.example/two')).toHaveLength(2);
  });
});

describe('playback selection', () => {
  it('prefers a configured source resolver over the built-in player definition', () => {
    const players = playersFromSourceConfig([
      { code: 'qz', name: '量子', isEnabled: true, mode: 'IFRAME_RESOLVER', resolverUrl: 'https://parse.example/?url=' },
    ]);

    expect(selectPlayback(parsePlayGroups('qz', '第一集$https://cdn.example/a.m3u8'), players).selection?.player.resolverUrl)
      .toBe('https://parse.example/?url=');
  });

  it('keeps valid source players first while rejecting malformed entries and duplicate codes', () => {
    const sourcePlayers = playersFromSourceConfig([
      { code: 'm3u8', name: '来源 M3U8', isEnabled: true, mode: 'HLS', resolverUrl: null },
      { code: 'm3u8', name: '重复', isEnabled: true, mode: 'HLS', resolverUrl: null },
      { code: 'invalid-mode', name: '无效模式', isEnabled: true, mode: 'EMBED', resolverUrl: null },
      { code: 'missing-enabled', name: '缺少状态', mode: 'HLS', resolverUrl: null },
      { code: 'unsafe-resolver', name: '不安全解析器', isEnabled: true, mode: 'IFRAME_RESOLVER', resolverUrl: 'javascript:alert(1)?url=' },
      { code: ' ', name: '空线路', isEnabled: true, mode: 'HLS', resolverUrl: null },
    ]);
    const players = [...sourcePlayers, ...DEFAULT_PLAYERS.filter((player) => !sourcePlayers.some((source) => source.code === player.code))];

    expect(players.map((player) => player.code)).toEqual(['m3u8', 'liangzi']);
    expect(selectPlayback(parsePlayGroups('m3u8', '第一集$https://cdn.example/a.m3u8'), players).selection?.player.name)
      .toBe('来源 M3U8');
  });

  it('excludes missing and disabled players, then falls back from invalid requested indices', () => {
    const groups = parsePlayGroups(
      'missing$$$closed$$$liangzi',
      '第1集$https://missing.example/a$$$第1集$https://closed.example/a$$$第1集$https://share.example/a#第2集$https://share.example/b',
    );
    const result = selectPlayback(groups, players, { source: 0, ep: 8 });

    expect(result.groups.map((group) => ({ source: group.source, available: group.available, reason: group.reason }))).toEqual([
      { source: 0, available: false, reason: '未配置播放器' },
      { source: 1, available: false, reason: '播放器已停用' },
      { source: 2, available: true, reason: null },
    ]);
    expect(result.selection).toMatchObject({ source: 2, ep: 0, player: players[0] });
    expect(result.reason).toBe('已切换至可用线路');
  });

  it('honors a valid requested source and episode', () => {
    const groups = parsePlayGroups('liangzi', '第1集$https://share.example/a#第2集$https://share.example/b');
    const result = selectPlayback(groups, players, { source: 0, ep: 1 });
    expect(result.selection).toMatchObject({ source: 0, ep: 1, url: 'https://share.example/b' });
    expect(result.reason).toBeNull();
  });

  it('keeps a valid requested source and falls back to its first safe episode when ep is absent or invalid', () => {
    const groups = parsePlayGroups(
      'liangzi$$$lzm3u8',
      '第1集$https://share.example/a#第2集$https://share.example/b$$$正片$https://media.example/video.m3u8',
    );
    expect(selectPlayback(groups, players, { source: 0 }).selection).toMatchObject({ source: 0, ep: 0 });
    const invalidEpisode = selectPlayback(groups, players, { source: 0, ep: 99 });
    expect(invalidEpisode.selection).toMatchObject({ source: 0, ep: 0 });
    expect(invalidEpisode.reason).toBe('已切换至本线路可用剧集');
  });

  it('does not treat an episode query without a source query as a cross-line request', () => {
    const groups = parsePlayGroups('liangzi', '第1集$https://share.example/a#第2集$https://share.example/b');
    expect(selectPlayback(groups, players, { ep: 99 })).toMatchObject({
      selection: { source: 0, ep: 0 },
      reason: null,
    });
  });

  it('skips resolver players with missing or malformed resolver configuration', () => {
    const groups = parsePlayGroups('broken$$$liangzi', '正片$https://media.example/a.m3u8$$$第1集$https://share.example/a');
    const brokenResolver: RegistryPlayer[] = [
      { code: 'broken', name: '故障解析器', mode: 'IFRAME_RESOLVER', isEnabled: true, resolverUrl: 'https://resolver.example/play?quality=high' },
      players[0],
    ];
    const result = selectPlayback(groups, brokenResolver);
    expect(result.groups[0]).toMatchObject({ available: false, reason: '播放器解析配置无效' });
    expect(result.selection).toMatchObject({ source: 1, ep: 0 });
  });
});

describe('playback URL safety', () => {
  it('accepts only absolute HTTP(S) playback URLs', () => {
    expect(isSafePlaybackUrl('https://media.example/a.m3u8')).toBe(true);
    expect(isSafePlaybackUrl('http://media.example/a.m3u8')).toBe(true);
    expect(isSafePlaybackUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePlaybackUrl('//media.example/a.m3u8')).toBe(false);
    expect(isSafePlaybackUrl('')).toBe(false);
  });

  it('appends an encoded safe playback URL to a resolver', () => {
    expect(buildResolverUrl('https://lziplayer.com/?url=', 'https://media.example/a.m3u8?token=a&b=c'))
      .toBe('https://lziplayer.com/?url=https%3A%2F%2Fmedia.example%2Fa.m3u8%3Ftoken%3Da%26b%3Dc');
    expect(buildResolverUrl('https://lziplayer.com/?url=', 'javascript:alert(1)')).toBeNull();
  });

  it('supports an empty url query parameter or a {url} parameter token without corrupting other query parameters', () => {
    const media = 'https://media.example/a.m3u8?token=a&b=c';
    expect(buildResolverUrl('https://resolver.example/play?quality=high&url=', media))
      .toBe('https://resolver.example/play?quality=high&url=https%3A%2F%2Fmedia.example%2Fa.m3u8%3Ftoken%3Da%26b%3Dc');
    expect(buildResolverUrl('https://resolver.example/play?quality=high&url={url}', media))
      .toBe('https://resolver.example/play?quality=high&url=https%3A%2F%2Fmedia.example%2Fa.m3u8%3Ftoken%3Da%26b%3Dc');
  });

  it('rejects resolver URLs without a safe empty url parameter or {url} token', () => {
    const media = 'https://media.example/a.m3u8';
    expect(buildResolverUrl('https://resolver.example/play?quality=high', media)).toBeNull();
    expect(buildResolverUrl('https://resolver.example/play?url=already-set', media)).toBeNull();
    expect(buildResolverUrl('https://resolver.example/play?url=&url=', media)).toBeNull();
    expect(buildResolverUrl('javascript:alert(1)?url=', media)).toBeNull();
  });
});
