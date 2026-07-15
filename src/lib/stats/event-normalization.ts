export function normalizeBehaviorEvent(raw: Record<string, unknown>) {
  return {
    eventType: typeof raw.eventType === 'string' ? raw.eventType : String(raw.event_type ?? ''),
    userId: typeof raw.userId === 'number' ? raw.userId : Number(raw.user_id) || -1,
    movieId: typeof raw.movieId === 'number' ? raw.movieId : Number(raw.movie_id) || undefined,
    data: typeof raw.data === 'object' && raw.data ? raw.data as Record<string, unknown> : undefined,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : undefined,
  };
}
