import {SourceName} from "@/types/sourceVars"

export interface ScrapedAnime {
  title: string;
  url: string;
  image: string;
  episode: number;
  source: SourceName;
  finished: boolean;
}

export interface RankedAnime extends ScrapedAnime {
  pseudoTimestamp: number;
}

export interface AnimeResult {
  title: string;
  image: string;
  url: string;
  source: SourceName;
  description: string;
}