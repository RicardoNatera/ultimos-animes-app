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

/**
 * Elige el resultado cuyo título más se parezca al buscado.
 * Solo se consideran los que tienen los mismos números ("2", "4th"...)
 * para no confundir temporadas. El primer resultado (el más relevante
 * para MAL) recibe además un bonus pequeño.
 */
export function pickBestMALCandidate(
  candidates: MALCandidate[],
  title: string
): number | null {
  const target = normalizeKey(title);
  const targetDigits = digitsOf(target);

  let best: { id: number; score: number } | null = null;

  for (let rank = 0; rank < candidates.length; rank++) {
    const candidate = candidates[rank];
    const key = normalizeKey(candidate.title);

    // Números distintos = otra temporada: se descarta
    if (digitsOf(key) !== targetDigits) continue;

    let score = stringSimilarity.compareTwoStrings(target, key) + 0.15;
    if (rank === 0) score += 0.05;

    if (!best || score > best.score) best = { id: candidate.id, score };
  }

  return best && best.score >= 0.6 ? best.id : null;
}

/**
 * Busca el MAL ID de un título directamente en My Anime List.
 */
export async function findMALId(title: string): Promise<number | null> {
  if (title.trim().length < 3) return null; // MAL exige mínimo 3 caracteres

  const url = `https://myanimelist.net/anime.php?q=${encodeURIComponent(title)}&cat=anime`;
  const html = await fetchMALPage(url);

  return pickBestMALCandidate(parseMALSearch(html), title);
}

/**
 * Elige, entre los resultados de búsqueda de una fuente, el que mejor
 * coincide con el título. Descarta los de otra temporada (números distintos).
 */
function bestLink(results: AnimeResult[], title: string): string | null {
  const target = normalizeKey(title);
  const targetDigits = digitsOf(target);

  let best: { url: string; score: number } | null = null;

  for (const result of results) {
    const key = normalizeKey(result.title);

    // Números distintos = otra temporada: se descarta
    if (digitsOf(key) !== targetDigits) continue;

    const score = stringSimilarity.compareTwoStrings(target, key);

    if (!best || score > best.score) best = { url: result.url, score };
  }

  return best && best.score >= 0.6 ? best.url : null;
}

/**
 * Todo lo necesario para una tarjeta de favoritos:
 * ficha de MAL + enlace directo al anime en cada fuente.
 */
export async function getFavoriteInfo(title: string) {
  const [mal, animeav1, otakustv] = await Promise.all([
    (async () => {
      try {
        const id = await findMALId(title);
        return id ? await getMALCard(id) : null;
      } catch (err) {
        console.error(`[favoritos] MAL falló para "${title}":`, err);
        return null;
      }
    })(),
    searchFromAnimeAV1(title).then((r) => bestLink(r, title)),
    searchFromOtakusTV(title).then((r) => bestLink(r, title)),
  ]);

  return { mal, links: { animeav1, otakustv } };
}

/**
 * Diagnóstico: muestra qué devuelve MAL al buscar un título y qué candidato
 * se elegiría. Útil cuando una tarjeta sale "Sin ficha en My Anime List".
 */
export async function debugMAL(title: string) {
  const url = `https://myanimelist.net/anime.php?q=${encodeURIComponent(title)}&cat=anime`;

  try {
    const html = await fetchMALPage(url);
    const candidates = parseMALSearch(html);

    return {
      url,
      htmlLength: html.length,
      pageTitle: html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null,
      candidates,
      chosenId: pickBestMALCandidate(candidates, title),
    };
  } catch (err) {
    const e = err as { message?: string; response?: { status?: number } };
    return {
      url,
      error: e.message ?? String(err),
      status: e.response?.status ?? null,
    };
  }
}