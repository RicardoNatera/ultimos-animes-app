import {SourceName} from "@/types/sourceVars"

export interface ScrapedAnime {
  title: string;
  url: string;
  image: string;
  episode: number;
  source: SourceName;
}

export interface RankedAnime extends ScrapedAnime {
  pseudoTimestamp: number;
}