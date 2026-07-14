import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAYERS, parsePlayGroups, playersFromSourceConfig, selectPlayback } from './playback';

describe('source player configuration', () => {
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
});
