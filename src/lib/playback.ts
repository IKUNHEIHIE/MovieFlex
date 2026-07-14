export type PlayerMode = 'HLS' | 'IFRAME_DIRECT' | 'IFRAME_RESOLVER';

export type RegistryPlayer = {
  code: string;
  name: string;
  mode: PlayerMode;
  isEnabled: boolean;
  resolverUrl: string | null;
};

export type PlaybackEpisode = {
  ep: number;
  name: string;
  url: string;
};

export type PlayGroup = {
  source: number;
  code: string;
  episodes: PlaybackEpisode[];
};

export type ResolvedPlayGroup = PlayGroup & {
  player: RegistryPlayer | null;
  available: boolean;
  reason: string | null;
};

export type PlaybackSelection = PlaybackEpisode & {
  source: number;
  player: RegistryPlayer;
};

export const DEFAULT_PLAYERS: readonly RegistryPlayer[] = [
  { code: 'liangzi', name: '量子云', mode: 'IFRAME_DIRECT', isEnabled: true, resolverUrl: null },
  { code: 'm3u8', name: 'M3U8', mode: 'HLS', isEnabled: true, resolverUrl: null },
];

function episodeFromValue(value: string, ep: number): PlaybackEpisode | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'no' || trimmed === '#') return null;

  const separator = trimmed.indexOf('$');
  const name = separator >= 0 ? trimmed.slice(0, separator).trim() : `第${ep + 1}集`;
  const url = separator >= 0 ? trimmed.slice(separator + 1).trim() : trimmed;
  if (!url || url.toLowerCase() === 'no' || url === '#') return null;

  return { ep, name: name || `第${ep + 1}集`, url };
}

/** Parses AppleCMS `vod_play_from` / `vod_play_url` fields without losing source indices. */
export function parsePlayGroups(playFrom: string | null | undefined, playUrl: string | null | undefined): PlayGroup[] {
  if (!playUrl) return [];

  const sourceCodes = (playFrom || '').split('$$$');
  return playUrl.split('$$$').map((line, source) => ({
    source,
    code: sourceCodes[source]?.trim() || `source-${source + 1}`,
    episodes: line.split('#').flatMap((value, ep) => {
      const episode = episodeFromValue(value, ep);
      return episode ? [episode] : [];
    }),
  }));
}

/** Only permit absolute media/provider addresses; no data, javascript, or protocol-relative URLs. */
export function isSafePlaybackUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildResolverUrl(resolverUrl: string | null | undefined, playbackUrl: string | null | undefined): string | null {
  if (!isSafePlaybackUrl(resolverUrl) || !isSafePlaybackUrl(playbackUrl)) return null;
  const resolver = new URL(resolverUrl);
  const urlParameters = resolver.searchParams.getAll('url');
  if (urlParameters.length !== 1) return null;

  if (urlParameters[0] === '') {
    resolver.searchParams.set('url', playbackUrl);
    return resolver.toString();
  }

  if (urlParameters[0] === '{url}' && resolverUrl.split('{url}').length === 2) {
    return resolverUrl.replace('{url}', encodeURIComponent(playbackUrl));
  }

  return null;
}

function hasSafeResolverConfiguration(player: RegistryPlayer): boolean {
  return player.mode !== 'IFRAME_RESOLVER'
    || buildResolverUrl(player.resolverUrl, 'https://example.invalid/playback') !== null;
}

function resolveGroups(groups: PlayGroup[], players: readonly RegistryPlayer[]): ResolvedPlayGroup[] {
  const playersByCode = new Map(players.map((player) => [player.code, player]));
  return groups.map((group) => {
    const player = playersByCode.get(group.code) ?? null;
    if (!player) return { ...group, player: null, available: false, reason: '未配置播放器' };
    if (!player.isEnabled) return { ...group, player, available: false, reason: '播放器已停用' };
    if (!hasSafeResolverConfiguration(player)) {
      return { ...group, player, available: false, reason: '播放器解析配置无效' };
    }
    if (!group.episodes.some((episode) => isSafePlaybackUrl(episode.url))) {
      return { ...group, player, available: false, reason: '没有可用剧集' };
    }
    return { ...group, player, available: true, reason: null };
  });
}

function validSelection(group: ResolvedPlayGroup | undefined, ep: number | undefined): PlaybackSelection | null {
  if (!group?.available || !group.player || ep === undefined) return null;
  const episode = group.episodes.find((candidate) => candidate.ep === ep);
  return episode && isSafePlaybackUrl(episode.url) ? { ...episode, source: group.source, player: group.player } : null;
}

export function selectPlayback(
  rawGroups: PlayGroup[],
  players: readonly RegistryPlayer[],
  requested: { source?: number | null; ep?: number | null } = {},
): { groups: ResolvedPlayGroup[]; selection: PlaybackSelection | null; reason: string | null } {
  const groups = resolveGroups(rawGroups, players);
  const source = Number.isInteger(requested.source) ? Number(requested.source) : undefined;
  const ep = Number.isInteger(requested.ep) ? Number(requested.ep) : undefined;
  const requestedGroup = source === undefined ? undefined : groups.find((group) => group.source === source);
  const requestedSelection = validSelection(requestedGroup, ep);
  if (requestedSelection) return { groups, selection: requestedSelection, reason: null };

  const requestedSourceEpisode = requestedGroup?.available && requestedGroup.player
    ? requestedGroup.episodes.find((episode) => isSafePlaybackUrl(episode.url))
    : undefined;
  if (requestedSourceEpisode && requestedGroup?.player) {
    return {
      groups,
      selection: { ...requestedSourceEpisode, source: requestedGroup.source, player: requestedGroup.player },
      reason: ep === undefined ? '已选择本线路首个可用剧集' : '已切换至本线路可用剧集',
    };
  }

  const fallbackGroup = groups.find((group) => group.available);
  const fallbackEpisode = fallbackGroup?.episodes.find((episode) => isSafePlaybackUrl(episode.url));
  const selection = fallbackGroup && fallbackEpisode && fallbackGroup.player
    ? { ...fallbackEpisode, source: fallbackGroup.source, player: fallbackGroup.player }
    : null;

  if (!selection) return { groups, selection: null, reason: '没有可用播放线路' };
  if (source !== undefined && selection.source !== source) return { groups, selection, reason: '已切换至可用线路' };
  return { groups, selection, reason: null };
}
