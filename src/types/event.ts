export type EventType =
  | 'click'
  | 'play_start'
  | 'play_progress'
  | 'play_end'
  | 'rate'
  | 'favorite'
  | 'search';

export interface BehaviorEvent {
  event_id: string;
  user_id: number;
  event_type: EventType;
  movie_id: number | null;
  timestamp: string;
  data: Record<string, unknown>;
  client_info: {
    user_agent: string;
    page_url: string;
  };
}
