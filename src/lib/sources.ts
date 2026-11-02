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

async function getLatestFromSource(source: keyof typeof scrapers): Promise<ScrapedAnime[]> {
  try {
    // Fuente apagada en SOURCE_ENABLED: ni siquiera se hace la petición
    if (!SOURCE_ENABLED[source]) return [];
    const html = await scrapers[source].fetch();
    const animes = await scrapers[source].parse(html);

    // Si el sitio responde pero no se lee nada, probablemente cambió su HTML
    if (animes.length === 0) {
      console.warn(`[${source}] 0 episodios leídos: ¿cambió el HTML del sitio?`);
    }

    return animes;
  } catch (err) {
    console.error(`Error scraping ${source}:`, err);
    return [];
  }
}

export async function reduceAnimes(): Promise<ScrapedAnime[]> {
  try {
    const [animeAV1, otakusTV, animeFLV] = await Promise.all([
      getLatestFromSource(SOURCES.animeav1),
      getLatestFromSource(SOURCES.otakustv),
      getLatestFromSource(SOURCES.animeflv),
    ]);
    const sources: Record<SourceName, ScrapedAnime[]> = {
      animeav1: animeAV1,
      otakustv: otakusTV,
      animeflv: animeFLV,
    };

    const ranked = rankAnimes(sources, isSameRelease);
    const deduped = deduplicateAnimes(ranked);
    deduped.sort((a, b) => b.pseudoTimestamp - a.pseudoTimestamp);

    const grouped = groupNearbyEpisodes(
      deduped.map(({ pseudoTimestamp, ...rest }) => rest)
    );

    return grouped;  
  } catch (err) {
    console.error("Error reducing animes:", err);
    return [];
  }
}