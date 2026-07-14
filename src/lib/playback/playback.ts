export {
  DEFAULT_PLAYERS,
  buildResolverUrl,
  isSafePlaybackUrl,
  parsePlayGroups,
  selectPlayback,
} from '../playback';
export type {
  PlaybackEpisode,
  PlaybackSelection,
  PlayerMode,
  PlayGroup,
  RegistryPlayer,
  ResolvedPlayGroup,
} from '../playback';

import { buildResolverUrl, type PlayerMode, type RegistryPlayer } from '../playback';

function isPlayerMode(value: unknown): value is PlayerMode {
  return value === 'HLS' || value === 'IFRAME_DIRECT' || value === 'IFRAME_RESOLVER';
}

/** Converts persisted normalized source player JSON into safe playback records. */
export function playersFromSourceConfig(config: unknown): RegistryPlayer[] {
  if (!Array.isArray(config)) return [];

  const codes = new Set<string>();
  return config.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const player = entry as Record<string, unknown>;
    const code = typeof player.code === 'string' ? player.code.trim() : '';
    const name = typeof player.name === 'string' ? player.name.trim() : '';
    if (!code || !name || codes.has(code) || !isPlayerMode(player.mode) || typeof player.isEnabled !== 'boolean') return [];

    const resolverUrl = player.mode === 'IFRAME_RESOLVER' && typeof player.resolverUrl === 'string'
      ? player.resolverUrl
      : null;
    const result: RegistryPlayer = { code, name, mode: player.mode, isEnabled: player.isEnabled, resolverUrl };
    if (result.mode === 'IFRAME_RESOLVER'
      && buildResolverUrl(result.resolverUrl, 'https://example.invalid/playback') === null) return [];

    codes.add(code);
    return [result];
  });
}
