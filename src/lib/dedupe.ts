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

function asAlternative(anime: ScrapedAnime): AnimeAlternative {
  return {
    source: anime.source,
    url: anime.url,
    setFinishedURL: anime.setFinishedURL,
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
    const existingIndex = deduped.findIndex(
      (existing) =>
        existing.episode === anime.episode &&
        isSameAnime(existing.title, anime.title)
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