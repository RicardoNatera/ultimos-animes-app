import type { AnimeAlternative, RankedAnime, ScrapedAnime } from "@/types/anime";
import { SOURCE_PRIORITY } from "@/types/sourceVars";
import { MIN_SCORE, titleMatch } from "@/lib/titles";

/**
 * ¿Son el mismo anime? Compara los títulos aunque cada sitio los escriba
 * distinto (con o sin subtítulo, "Part 2" o "2nd Season"...), pero nunca
 * mezcla temporadas distintas.
 */
export function isSameAnime(a: string, b: string): boolean {
  const match = titleMatch(a, b);
  return match !== null && match.score >= MIN_SCORE;
}

// Diferencia mínima de capítulos para creer que es otra numeración y no un simple retraso
const MIN_PART_OFFSET = 6;

/** "Foo Season 2 Part 2" -> { base: "Foo Season 2", part: 2 } · sin "Part N" -> part: null */
function splitPart(title: string): { base: string; part: number | null } {
  const match = title.trim().match(/^(.*?)[\s:,–-]*\b(?:part|cour)\s+(\d+)\s*$/i);
  return match
    ? { base: match[1].trim(), part: Number(match[2]) }
    : { base: title.trim(), part: null };
}

/**
 * Mismo anime y mismo lanzamiento aunque cada sitio numere distinto.
 * AnimeAV1 abre un anime nuevo por cada "Part 2" y reinicia la cuenta (cap. 4),
 * mientras que otros sitios siguen contando (cap. 17). Solo se da por bueno si:
 *  - exactamente uno de los dos lleva "Part N" (N ≥ 2),
 *  - sin ese "Part N" los títulos coinciden (incluida la temporada), y
 *  - el que NO lleva "Part N" va bastante más adelantado en capítulos
 *    (un retraso normal entre sitios es de 1 o 2 capítulos, no de 6 o más).
 */
export function isPartContinuation(a: ScrapedAnime, b: ScrapedAnime): boolean {
  const pa = splitPart(a.title);
  const pb = splitPart(b.title);

  let marked: ScrapedAnime;
  let unmarked: ScrapedAnime;
  if (pa.part !== null && pa.part >= 2 && pb.part === null) {
    marked = a;
    unmarked = b;
  } else if (pb.part !== null && pb.part >= 2 && pa.part === null) {
    marked = b;
    unmarked = a;
  } else {
    return false;
  }

  if (!isSameAnime(splitPart(marked.title).base, unmarked.title)) return false;

  return unmarked.episode - marked.episode >= MIN_PART_OFFSET;
}

/**
 * ¿Es el mismo capítulo del mismo anime? Mismo anime y mismo número, o la
 * misma tanda con numeración distinta entre sitios (ver isPartContinuation).
 */
export function isSameRelease(a: ScrapedAnime, b: ScrapedAnime): boolean {
  if (a.episode === b.episode && isSameAnime(a.title, b.title)) return true;

  return a.source !== b.source && isPartContinuation(a, b);
}

function asAlternative(anime: ScrapedAnime): AnimeAlternative {
  return {
    source: anime.source,
    url: anime.url,
    setFinishedURL: anime.setFinishedURL,
    episode: anime.episode,
  };
}

/** Fuentes alternativas de ambas entradas, sin repetir fuentes ni la del ganador. */
function mergeAlternatives(
  winner: ScrapedAnime,
  loser: ScrapedAnime
): AnimeAlternative[] {
  const all = [
    ...(winner.alternatives ?? []),
    ...(loser.alternatives ?? []),
    asAlternative(loser),
  ];

  const seen = new Set<string>([winner.source]);

  return all
    .filter((alt) => {
      if (seen.has(alt.source)) return false;
      seen.add(alt.source);
      return true;
    })
    .sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
}

/**
 * Une las entradas del mismo anime y el mismo capítulo. La tarjeta que se
 * muestra es la de la fuente con más prioridad, y las demás fuentes quedan
 * en `alternatives` para poder pedir también sus enlaces de descarga.
 */
export function deduplicateAnimes(animes: RankedAnime[]): RankedAnime[] {
  const deduped: RankedAnime[] = [];

  for (const anime of animes) {
    const existingIndex = deduped.findIndex((existing) =>
      isSameRelease(existing, anime)
    );

    if (existingIndex === -1) {
      deduped.push(anime);
      continue;
    }

    const existing = deduped[existingIndex];
    const priorityA = SOURCE_PRIORITY[anime.source];
    const priorityB = SOURCE_PRIORITY[existing.source];

    const animeWins =
      priorityA < priorityB ||
      (priorityA === priorityB && anime.pseudoTimestamp > existing.pseudoTimestamp);

    const [winner, loser] = animeWins ? [anime, existing] : [existing, anime];
    const alternatives = mergeAlternatives(winner, loser);

    deduped[existingIndex] =
      alternatives.length > 0 ? { ...winner, alternatives } : winner;
  }

  return deduped;
}

/** Junta los capítulos del mismo anime (de mayor a menor número). */
export function groupNearbyEpisodes<T extends ScrapedAnime>(animes: T[]): T[] {
  const groups: T[][] = [];

  for (const anime of animes) {
    // Buscar si ya existe un grupo con un título similar
    let matchedGroup = groups.find(
      (group) => group.length > 0 && isSameAnime(group[0].title, anime.title)
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