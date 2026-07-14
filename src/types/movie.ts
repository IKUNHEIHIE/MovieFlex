export interface MovieCard {
  id: number;
  title: string;
  picUrl: string | null;
  typeName: string | null;
  year: number | null;
  area: string | null;
  score: number;
  remarks: string | null;
  viewCount: number;
}

export interface MovieDetail extends MovieCard {
  titleEn: string | null;
  director: string | null;
  actors: string | null;
  language: string | null;
  description: string | null;
  scoreCount: number;
  playSources: PlaySource[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaySource {
  name: string;
  episodes: Episode[];
}

export interface Episode {
  name: string;
  url: string;
}

export interface MovieFilter {
  typeId?: number;
  area?: string;
  year?: number;
  language?: string;
  sortBy?: 'latest' | 'score' | 'views';
  page?: number;
  pageSize?: number;
}

export interface CollectSourceConfig {
  id: number;
  name: string;
  apiUrl: string;
  sourceKey: string;
  format: 'JSON' | 'XML';
  isActive: boolean;
  lastSync: string | null;
}

/** Raw response from resource site API */
export interface ResourceApiResponse {
  code: number;
  msg: string;
  page: string | number;
  pagecount: number;
  limit: string | number;
  total: number;
  list: ResourceMovie[];
}

export interface ResourceMovie {
  vod_id: number;
  type_id: number;
  type_name: string;
  vod_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_play_url: string;
  vod_actor: string;
  vod_director: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_pic: string;
  vod_content: string;
}
