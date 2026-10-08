import * as cheerio from "cheerio";
import stringSimilarity from "string-similarity";
import type { AnimeResult } from "@/types/anime";
import { fetchMALPage, getMALCard } from "@/lib/scrapers/scraper";
import { searchFromAnimeAV1, searchFromOtakusTV } from "@/lib/scrapers/search";
import { digitsOf, normalizeKey } from "@/lib/titles";

type MALCandidate = { id: number; title: string };

/**
 * Extrae los resultados de https://myanimelist.net/anime.php?q=...
 * Cada resultado es un enlace `a.hoverinfo_trigger` a /anime/{id}/...
 * (la imagen y el título comparten enlace: nos quedamos con el que tiene texto).
 * Si MAL redirige a la ficha de un único resultado, devuelve ese anime.
 */
export function parseMALSearch(html: string): MALCandidate[] {
  const $ = cheerio.load(html);

  // Con un único resultado MAL redirige directamente a la ficha del anime:
  // no hay tabla de resultados, pero la URL canónica trae el id.
  const canonical =
    $('meta[property="og:url"]').attr("content") ||
    $('link[rel="canonical"]').attr("href") ||
    "";
  const direct = canonical.match(/myanimelist\.net\/anime\/(\d+)/);

  if (direct) {
    const title = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
    return title ? [{ id: Number(direct[1]), title }] : [];
  }

  const seen = new Set<number>();
  const candidates: MALCandidate[] = [];

  const collect = (selector: string) => {
    $(selector).each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const match = href.match(/myanimelist\.net\/anime\/(\d+)/);
      const title = $(el).text().trim();
      if (!match || !title) return;

      const id = Number(match[1]);
      if (seen.has(id)) return;

      seen.add(id);
      candidates.push({ id, title });
    });
  };

  // Tabla de resultados; si MAL cambiara el contenedor, probamos sin él
  collect(".js-categories-seasonal a.hoverinfo_trigger");
  if (candidates.length === 0) collect("a.hoverinfo_trigger");

  return candidates.slice(0, 8);
}

/** Partículas y artículos: no cuentan como "palabras en común". */
const STOPWORDS = new Set([
  "no", "wa", "ga", "to", "ni", "de", "wo", "na", "ka", // partículas japonesas
  "the", "of", "and", "an", "in", "on", // artículos y preposiciones en inglés
]);

/** Similitud mínima para dar un título por válido. */
const MIN_SCORE = 0.7;

/** Palabras de una clave normalizada (sin las de 1 letra ni las partículas). */
function tokensOf(key: string): string[] {
  return [
    ...new Set(
      key.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t))
    ),
  ];
}

/**
 * Cuánto encaja un título candidato con el buscado (0 a 1).
 * Devuelve null si es otra temporada (números distintos).
 *
 * Los sitios abrevian o reescriben los títulos, así que además de la
 * similitud de texto se valoran las palabras en común: si un título está
 * contenido en el otro (p. ej. sin el subtítulo largo) también encaja.
 */
function titleMatch(
  target: string,
  candidateTitle: string
): { score: number; shared: number } | null {
  const targetKey = normalizeKey(target);
  const candidateKey = normalizeKey(candidateTitle);

  // Números distintos = otra temporada: se descarta
  if (digitsOf(candidateKey) !== digitsOf(targetKey)) return null;

  const targetTokens = tokensOf(targetKey);
  const candidateTokens = tokensOf(candidateKey);

  const shared = targetTokens.filter((t) => candidateTokens.includes(t)).length;
  const minTokens = Math.min(targetTokens.length, candidateTokens.length);

  const dice = stringSimilarity.compareTwoStrings(targetKey, candidateKey);
  const overlap = minTokens >= 2 && shared >= 2 ? 0.85 * (shared / minTokens) : 0;

  return { score: Math.max(dice, overlap), shared };
}

/**
 * Elige el resultado de MAL que mejor encaja con el título buscado.
 * - El primer resultado (el más relevante para MAL) recibe un bonus pequeño.
 * - Si MAL devolvió un único resultado, se da por bueno cuando comparte
 *   alguna palabra con lo buscado (MAL también busca en títulos alternativos).
 */
export function pickBestMALCandidate(
  candidates: MALCandidate[],
  title: string
): number | null {
  let best: { id: number; score: number } | null = null;

  for (let rank = 0; rank < candidates.length; rank++) {
    const match = titleMatch(title, candidates[rank].title);
    if (!match) continue;

    let score = match.score;
    if (rank === 0) score += 0.05;
    if (candidates.length === 1 && match.shared >= 1) score = Math.max(score, 0.8);

    if (!best || score > best.score) best = { id: candidates[rank].id, score };
  }

    return best && best.score >= MIN_SCORE ? best.id : null;
}

/**
 * Quita el marcador de temporada del final:
 * "Foo 3rd Season" -> "Foo", "Foo Season 2" -> "Foo", "Foo Part 2" -> "Foo", "Foo 4" -> "Foo".
 * Cada sitio llama a las temporadas a su manera ("3rd Season", "3", "Part 3"...),
 * así que buscar sin ese sufijo devuelve todas y luego elegimos la correcta.
 */
function withoutSeason(title: string): string {
  return title
    .replace(
      /[\s:,–-]*\b(?:\d+(?:st|nd|rd|th)\s+(?:season|cour)|(?:season|part|cour)\s+\d+)\b.*$/i,
      ""
    )
    .replace(/\s+\d+$/, "")
    .trim();
}

/**
 * Variantes de búsqueda, de más a menos específica: el título completo, sin el
 * marcador de temporada, lo anterior al primer ":" o ",", y las 3 primeras
 * palabras. Los títulos largos de las fuentes a veces no coinciden con el de
 * MAL (u otro sitio) si se buscan enteros.
 */
export function searchQueries(title: string): string[] {
  const clean = title.trim();
  const queries = [clean, withoutSeason(clean)];

  const cut = clean.search(/[:,：]/);
  if (cut > 0) queries.push(clean.slice(0, cut).trim());

  queries.push(clean.split(/\s+/).slice(0, 3).join(" "));

  // Mínimo 3 caracteres; sin repetidas
  return [...new Set(queries)].filter((q) => q.length >= 3);
}

const malSearchUrl = (query: string) =>
  `https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}&cat=anime`;

/**
 * Busca el MAL ID de un título directamente en My Anime List,
 * probando las variantes de búsqueda hasta encontrar una coincidencia.
 *
 * Un fallo en una variante no corta la búsqueda: MAL responde 404 a las
 * búsquedas muy largas, y justo entonces la variante corta sí funciona.
 * Solo se propaga el error si NINGUNA variante pudo consultarse.
 */
export async function findMALId(title: string): Promise<number | null> {
  let consulted = false;
  let lastError: unknown = null;

  for (const query of searchQueries(title)) {
    try {
      const html = await fetchMALPage(malSearchUrl(query));
      consulted = true;

      const id = pickBestMALCandidate(parseMALSearch(html), title);
      if (id) return id;
    } catch (err) {
      lastError = err;
    }
  }

  if (!consulted && lastError) throw lastError;

  return null;
}

/**
 * Elige, entre los resultados de búsqueda de una fuente, el que mejor
 * coincide con el título (con la misma puntuación que usamos para MAL).
 * Devuelve también el título con el que ese sitio llama al anime.
 */
function bestMatch(
  results: AnimeResult[],
  title: string
): { url: string; title: string } | null {
  let best: { url: string; title: string; score: number } | null = null;

  for (const result of results) {
    const match = titleMatch(title, result.title);
    if (!match) continue;

    if (!best || match.score > best.score) {
      best = { url: result.url, title: result.title, score: match.score };
    }
  }

  return best && best.score >= MIN_SCORE
    ? { url: best.url, title: best.title }
    : null;
}

/**
 * Busca el anime en una fuente probando las variantes de búsqueda
 * hasta que alguna devuelva una coincidencia.
 */
async function searchSource(
  search: (query: string) => Promise<AnimeResult[]>,
  title: string
) {
  for (const query of searchQueries(title)) {
    const match = bestMatch(await search(query), title);
    if (match) return match;
  }

  return null;
}

/**
 * Todo lo necesario para una tarjeta de favoritos:
 * ficha de MAL + enlace directo al anime en cada fuente.
 *
 * Si MAL no reconoce el título tal cual lo escribe la fuente de la home,
 * se prueba con el título con el que AnimeAV1 u OtakusTV llaman al anime
 * (cada sitio abrevia o romaniza a su manera).
 */
export async function getFavoriteInfo(title: string) {
  const sourcesPromise = Promise.all([
    searchSource(searchFromAnimeAV1, title),
    searchSource(searchFromOtakusTV, title),
  ]).then(([animeav1, otakustv]) => ({ animeav1, otakustv }));

  const malPromise = (async () => {
    try {
      let id = await findMALId(title);

      if (!id) {
        const sources = await sourcesPromise;
        const tried = new Set([normalizeKey(title)]);

        for (const alt of [sources.animeav1?.title, sources.otakustv?.title]) {
          if (!alt || tried.has(normalizeKey(alt))) continue;
          tried.add(normalizeKey(alt));

          id = await findMALId(alt);
          if (id) break;
        }
      }
      
      if (!id) console.warn(`[favoritos] sin coincidencia en MAL para "${title}"`);
      return id ? await getMALCard(id) : null;
    } catch (err) {
      console.error(`[favoritos] MAL falló para "${title}":`, err);
      return null;
    }
  })();

  const [mal, sources] = await Promise.all([malPromise, sourcesPromise]);

  return {
    mal,
    links: {
      animeav1: sources.animeav1?.url ?? null,
      otakustv: sources.otakustv?.url ?? null,
    },
  };
}

/**
 * Diagnóstico: para cada variante de búsqueda, muestra qué devuelve MAL y qué
 * candidato se elegiría. Útil cuando una tarjeta sale "Sin ficha en My Anime List".
 */
export async function debugMAL(title: string) {
  const attempts: Record<string, unknown>[] = [];

  for (const query of searchQueries(title)) {
    const url = malSearchUrl(query);

    try {
      const html = await fetchMALPage(url);
      const candidates = parseMALSearch(html);
      const chosenId = pickBestMALCandidate(candidates, title);

      attempts.push({
        query,
        pageTitle: html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null,
        // Pistas de la estructura de la página, por si no hay candidatos
        noResultsMessage: /No titles that matched/i.test(html),
        hasResultsTable: html.includes("js-categories-seasonal"),
        hoverLinks: (html.match(/hoverinfo_trigger/g) ?? []).length,
        candidates,
        chosenId,
      });

      if (chosenId) break;
    } catch (err) {
      const e = err as { message?: string; response?: { status?: number } };
      attempts.push({
        query,
        error: e.message ?? String(err),
        status: e.response?.status ?? null,
      });
    }
  }

  return { title, attempts };
}

/**
 * Diagnóstico de las fuentes: para cada variante de búsqueda, qué resultados
 * devuelve AnimeAV1 / OtakusTV y cuál se elegiría.
 */
export async function debugSources(title: string) {
  const out: Record<string, unknown[]> = { animeav1: [], otakustv: [] };

  const sources = [
    ["animeav1", searchFromAnimeAV1],
    ["otakustv", searchFromOtakusTV],
  ] as const;

  for (const [name, search] of sources) {
    for (const query of searchQueries(title)) {
      const results = await search(query);
      const chosen = bestMatch(results, title);

      out[name].push({
        query,
        resultCount: results.length,
        firstResults: results.slice(0, 5).map((r) => r.title),
        chosen: chosen?.title ?? null,
      });

      if (chosen) break;
    }
  }

  return { title, ...out };
}