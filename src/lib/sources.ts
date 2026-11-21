import { ScrapedAnime } from "@/types/anime";
import {SOURCES, SOURCE_ENABLED, SourceName} from "@/types/sourceVars"
import { deduplicateAnimes, groupNearbyEpisodes, isSameRelease } from "@/lib/dedupe";
import { rankAnimes } from "@/lib/ordering";

import {
  fetchAnimeFLVHTML, parseAnimeFLV,
  fetchAnimeAV1HTML, parseAnimeAV1,
  fetchOtakusTVHTML, parseOtakusTV
} from "./scrapers/scraper";

const scrapers = {
  [SOURCES.animeflv]: {
    fetch: fetchAnimeFLVHTML,
    parse: parseAnimeFLV,
  },
  [SOURCES.animeav1]: {
    fetch: fetchAnimeAV1HTML,
    parse: parseAnimeAV1,
  },
  [SOURCES.otakustv]: {
    fetch: fetchOtakusTVHTML,
    parse: parseOtakusTV,
  },
} as const;

export type SourceStatus = {
  enabled: boolean;
  /** false si falló, se agotó el tiempo o no se leyó ningún episodio */
  ok: boolean;
  ms: number;
  count: number;
};

type SourceResult = { animes: ScrapedAnime[]; status: SourceStatus };

async function getLatestFromSource(source: keyof typeof scrapers): Promise<SourceResult> {
  // Fuente apagada en SOURCE_ENABLED: ni siquiera se hace la petición
  if (!SOURCE_ENABLED[source]) {
    return { animes: [], status: { enabled: false, ok: true, ms: 0, count: 0 } };
  }

  const start = performance.now();

  try {
    const html = await scrapers[source].fetch();
    const animes = await scrapers[source].parse(html);

    // Si el sitio responde pero no se lee nada, probablemente cambió su HTML
    if (animes.length === 0) {
      console.warn(`[${source}] 0 episodios leídos: ¿cambió el HTML del sitio?`);
    }

    const ms = performance.now() - start;
    if (ms > 3000) console.warn(`[${source}] tardó ${Math.round(ms)} ms`);

    return { animes, status: { enabled: true, ok: animes.length > 0, ms, count: animes.length } };
  } catch (err) {
    console.error(`Error scraping ${source}:`, err);
    return {
      animes: [],
      status: { enabled: true, ok: false, ms: performance.now() - start, count: 0 },
    };
  }
}

export type HomeResult = {
  animes: ScrapedAnime[];
  sources: Record<SourceName, SourceStatus>;
  /** true si todas las fuentes encendidas respondieron bien */
  complete: boolean;
};

export async function reduceAnimesWithStatus(): Promise<HomeResult> {
  const [animeAV1, otakusTV, animeFLV] = await Promise.all([
    getLatestFromSource(SOURCES.animeav1),
    getLatestFromSource(SOURCES.otakustv),
    getLatestFromSource(SOURCES.animeflv),
  ]);

  const statuses: Record<SourceName, SourceStatus> = {
    animeav1: animeAV1.status,
    otakustv: otakusTV.status,
    animeflv: animeFLV.status,
  };
  const complete = Object.values(statuses).every((s) => !s.enabled || s.ok);

  try {
    const lists: Record<SourceName, ScrapedAnime[]> = {
      animeav1: animeAV1.animes,
      otakustv: otakusTV.animes,
      animeflv: animeFLV.animes,
    };

    const ranked = rankAnimes(lists, isSameRelease);
    const deduped = deduplicateAnimes(ranked);
    deduped.sort((a, b) => b.pseudoTimestamp - a.pseudoTimestamp);

    const grouped = groupNearbyEpisodes(
      deduped.map(({ pseudoTimestamp, ...rest }) => rest)
    );

    return { animes: grouped, sources: statuses, complete };
  } catch (err) {
    console.error("Error reducing animes:", err);
    return { animes: [], sources: statuses, complete: false };
  }
}

export async function reduceAnimes(): Promise<ScrapedAnime[]> {
  return (await reduceAnimesWithStatus()).animes;
}