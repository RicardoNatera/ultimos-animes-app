import {SourceName} from "@/types/sourceVars"

/** El mismo capítulo del mismo anime en otra fuente. */
export interface AnimeAlternative {
  source: SourceName;
  url: string;
  setFinishedURL: string;
  episode: number; // cada sitio puede numerar distinto (relativo o acumulado)
}

export interface ScrapedAnime {
  title: string;
  url: string;
  image: string;
  episode: number;
  // Antigüedad del episodio si el sitio la muestra ("hace 7 horas")
  minutesAgo?: number;
  agoLabel?: string;
  source: SourceName;
  finished: boolean;
  setFinishedURL: string;
  // Mismo anime y capítulo en otras fuentes (la tarjeta es la de mayor prioridad)
  alternatives?: AnimeAlternative[];
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