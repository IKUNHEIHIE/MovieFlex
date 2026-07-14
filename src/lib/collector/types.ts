export type SourceFormat = 'JSON' | 'XML';

export type RawMovie = {
  vod_id: number | string;
  vod_name?: string;
  vod_en?: string;
  type_id?: number | string;
  type_name?: string;
  vod_pic?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_area?: string;
  vod_lang?: string;
  vod_year?: string | number;
  vod_remarks?: string;
  vod_content?: string;
  vod_play_from?: string;
  vod_play_url?: string;
  vod_time?: string;
};

export interface CollectWarning {
  sourceTypeId: number;
  sourceTypeName: string;
  reason: string;
}

export interface CollectResult {
  fetched: number;
  saved: number;
  pageCount: number;
  warnings: CollectWarning[];
}

export interface CollectPageInput {
  sourceKey: string;
  apiUrl: string;
  format: SourceFormat;
  page: number;
  recentHours?: number;
}
