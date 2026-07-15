import { describe, expect, it } from 'vitest';
import { normalizeBehaviorEvent } from './event-normalization';

describe('normalizeBehaviorEvent', () => {
  it('maps Kafka snake_case events to the stats consumer contract', () => {
    expect(normalizeBehaviorEvent({ event_type: 'play_start', user_id: 12, movie_id: 34, data: { progress: '80' }, timestamp: '2026-07-15T00:00:00.000Z' }))
      .toEqual({ eventType: 'play_start', userId: 12, movieId: 34, data: { progress: '80' }, timestamp: '2026-07-15T00:00:00.000Z' });
  });
});
