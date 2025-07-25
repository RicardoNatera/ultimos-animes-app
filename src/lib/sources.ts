import { ScrapedAnime, RankedAnime } from "@/types/anime";
import {SOURCES, SOURCE_PRIORITY, SourceName} from "@/types/sourceVars"
import {
  fetchAnimeFLVHTML, parseAnimeFLV,
  fetchAnimeAV1HTML, parseAnimeAV1,
  fetchOtakusTVHTML, parseOtakusTV
} from "./scrapers/scraper";
import stringSimilarity from "string-similarity";

const SIMILARITY_THRESHOLD = 0.8
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

function areSimilarTitles(title1: string, title2: string): boolean {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  return stringSimilarity.compareTwoStrings(norm1, norm2) >= SIMILARITY_THRESHOLD;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/(part\s*\d+|\d+(?:st|nd|rd|th)?\s*season)/gi, "")
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
async function getLatestFromSource(source: keyof typeof scrapers): Promise<ScrapedAnime[]> {
  try {
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

// Deduplicar por título normalizado + número de episodio, priorizando fuente
function deduplicateAnimes(animes: RankedAnime[]): RankedAnime[] {
  const deduped: RankedAnime[] = [];

  for (const anime of animes) {
    const episode = anime.episode;

    const existingIndex = deduped.findIndex((existing) =>
      existing.episode === episode &&
      areSimilarTitles(existing.title, anime.title)
    );

    if (existingIndex === -1) {
      deduped.push(anime);
    } else {
      const existing = deduped[existingIndex];
      const priorityA = SOURCE_PRIORITY[anime.source];
      const priorityB = SOURCE_PRIORITY[existing.source];

      if (
        priorityA < priorityB ||
        (priorityA === priorityB && anime.pseudoTimestamp > existing.pseudoTimestamp)
      ) {
        deduped[existingIndex] = anime;
      }
    }
  }

  return deduped;
}


function groupNearbyEpisodes(animes: ScrapedAnime[]): ScrapedAnime[] {
  const groups: ScrapedAnime[][] = [];

  for (const anime of animes) {
    // Buscar si ya existe un grupo con un título similar
    let matchedGroup = groups.find(group =>
      group.length > 0 && areSimilarTitles(group[0].title, anime.title)
    );

    // Si no hay grupo similar, crear uno nuevo
    if (!matchedGroup) {
      matchedGroup = [];
      groups.push(matchedGroup);
    }

    matchedGroup.push(anime);
  }

  // Ordenar episodios dentro de cada grupo (de mayor a menor número)
  for (const group of groups) {
    group.sort((a, b) => (b.episode || 0) - (a.episode || 0));
  }

  // Aplanar todos los grupos en un solo array, manteniendo el orden original
  return groups.flat();
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