import { ScrapedAnime, RankedAnime } from "@/types/anime";
import {SOURCES, SOURCE_PRIORITY, SourceName} from "@/types/sourceVars"
import {
  fetchAnimeFLVHTML, parseAnimeFLV,
  fetchAnimeAV1HTML, parseAnimeAV1,
  fetchOtakusTVHTML, parseOtakusTV
} from "./scrapers/scraper";
import { deduplicateAnimes, groupNearbyEpisodes } from "@/lib/dedupe";

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
    if(source=='animeflv') return []; //animeflv down
    const html = await scrapers[source].fetch();
    return scrapers[source].parse(html);
  } catch (err) {
    console.error(`Error scraping ${source}:`, err);
    return [];
  }
}

function assignPseudoTimestampsInterleaved(sources: Record<string, ScrapedAnime[]>): RankedAnime[] {
  const result: RankedAnime[] = [];
  const baseTimestamp = 10000;

  // Convertir a arreglo de claves ordenadas por prioridad
  const sourceKeys = Object.keys(sources).sort((a, b) => SOURCE_PRIORITY[a] - SOURCE_PRIORITY[b]);

  let index = 0;
  let currentTimestamp = baseTimestamp;

  // Mientras alguna fuente tenga elementos en esa posición
  while (true) {
    let anyAdded = false;

    for (const source of sourceKeys) {
      const list = sources[source];
      if (index < list.length) {
        result.push({
          ...list[index],
          pseudoTimestamp: currentTimestamp--,
        });
        anyAdded = true;
      }
    }

    if (!anyAdded) break; // ya no hay más elementos en ninguna fuente
    index++;
  }

  return result;
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

    const ranked = assignPseudoTimestampsInterleaved(sources);
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