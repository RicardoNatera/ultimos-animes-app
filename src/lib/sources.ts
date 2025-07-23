import { fetchAnimeFLVHTML, parseAnimeFLV, 
         fetchAnimeAV1HTML, parseAnimeAV1,
         fetchOtakusTVHTML, parseOtakusTV } from "./scrapers/scraper";
import stringSimilarity from "string-similarity";
export async function getLatestFromFLV() {
  try {
    const html = await fetchAnimeFLVHTML();
    return parseAnimeFLV(html);
  } catch (err) {
    console.error("Error scraping AnimeFLV:", err);
    return [];
  }
}

export async function getLatestFromAV1() {
  try {
    const html = await fetchAnimeAV1HTML();
    return parseAnimeAV1(html);
  } catch (err) {
    console.error("Error scraping AnimeAV1:", err);
    return [];
  }
}

export async function getLatestFromOtakusTV() {
  try {
    const html = await fetchOtakusTVHTML();
    return parseOtakusTV(html);
  } catch (err) {
    console.error("Error scraping AnimeAV1:", err);
    return [];
  }
}
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/(part\s*\d+|\d+(?:st|nd|rd|th)?\s*season)/gi, "")
    .replace(/[^a-z0-9\s]/gi, "") // quita caracteres especiales
    .trim();
}
function isSimilarTitle(titleA: string, titleB: string): boolean {
  const similarity = stringSimilarity.compareTwoStrings(
    normalizeTitle(titleA),
    normalizeTitle(titleB)
  );
  return similarity > 0.8;
}

export async function reduceAnimes(){
  try {
    const animes: { title: string; url: string; image: string; source: "animeflv" | "animeav1" | "otakustv" }[] = [];
    const animeAV1Animes = await getLatestFromAV1();
    const otakusTVAnimes = await getLatestFromOtakusTV();
    const animeFLVAnimes = await getLatestFromFLV();
    
    const sources = [animeAV1Animes, otakusTVAnimes, animeFLVAnimes];
    for (const sourceList of sources) {
      for (const anime of sourceList) {
        const alreadyExists = animes.some((a) => isSimilarTitle(a.title, anime.title));
        if (!alreadyExists) {
          animes.push(anime);
        }
      }
    }
    return animes
  } catch (err) {
    console.error("Error scraping websites:", err);
    return [];
  }
}