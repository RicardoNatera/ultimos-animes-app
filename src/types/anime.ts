export type AnimeSource = "animeflv" | "animeav1" | "otakustv";

export interface ScrapedAnime {
  title: string;
  url: string;
  image: string;
  episode: number;
  source: AnimeSource;
}

export type GroupedAnime = {
  title: string; 
  normalizedTitle: string; 
  episodes: ScrapedAnime[]; 
};