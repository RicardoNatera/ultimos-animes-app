import { fetchAnimeFLVHTML, parseAnimeFLV } from "./scrapers/scraper";

export async function getLatestFromFLV() {
  try {
    const html = await fetchAnimeFLVHTML();
    return parseAnimeFLV(html);
  } catch (err) {
    console.error("Error scraping AnimeFLV:", err);
    return [];
  }
}