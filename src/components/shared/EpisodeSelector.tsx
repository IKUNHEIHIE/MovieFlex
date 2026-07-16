import Link from 'next/link';
import type { ResolvedPlayGroup, PlaybackSelection } from '@/lib/playback/playback';

interface EpisodeSelectorProps {
  movieId: number;
  groups: ResolvedPlayGroup[];
  activeSource?: ResolvedPlayGroup;
  activeEpisode?: PlaybackSelection | null;
}

export default function EpisodeSelector({ movieId, groups, activeSource, activeEpisode }: EpisodeSelectorProps) {
  if (groups.length === 0) return null;

  return (
    <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
      <div className="episode-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>选集播放</h2>
        {groups.length > 1 && (
          <div className="source-tabs" style={{ display: 'flex', gap: '8px' }}>
            {groups.map((source) => (
              <Link
                href={`/movie/${movieId}?source=${source.source}&ep=0`}
                key={source.code}
                className={`source-tab ${activeSource?.source === source.source ? 'active' : ''}`}
              >
                {source.player?.name || source.code}{source.available ? '' : `（${source.reason}）`}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '12px'
      }}>
        {activeSource?.episodes.map((ep) => (
          <Link
            href={`/movie/${movieId}?source=${activeSource.source}&ep=${ep.ep}`}
            key={`${ep.ep}-${ep.name}`}
            className={`episode-btn ${activeEpisode?.ep === ep.ep ? 'active' : ''}`}
          >
            {ep.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
