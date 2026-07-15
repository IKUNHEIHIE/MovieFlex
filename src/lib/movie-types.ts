export interface MovieCardData {
  id: number;
  title: string;
  picUrl: string | null;
  score: number | { toString(): string };
  remarks: string | null;
  typeName: string | null;
  year: number | null;
}

export interface CarouselMovieData extends MovieCardData {
  description: string | null;
}

export interface RecommendationMovieData {
  id: number;
  title: string;
  picUrl: string | null;
  score: number | { toString(): string };
  typeName: string | null;
}
