import axios from "axios";
import * as cheerio from 'cheerio';
import { ScrapedAnime } from "@/types/anime";

export function extractEpisodeNumber(text: string): number {
  const match = text.match(/\d+/); // busca el primer número en la cadena
  return match ? parseInt(match[0], 10) : 0; // si no encuentra, retorna 0
}

export function getDefaultScraperHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Referer": "https://google.com",
    "Cache-Control": "no-cache",
  };
}

async function fetchAnimeFLVStatus(animeUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(animeUrl, {headers: getDefaultScraperHeaders()});
    const $ = cheerio.load(res.data);

    const statusText = $(".AnmStts").text().toLowerCase();
    // Ejemplo: "en emision" o "finalizado"
    return statusText.includes("finalizado");
  } catch (err) {
    console.error(`Error obteniendo estado de ${animeUrl}`, err);
    return false; // Por defecto no finalizado si hubo error
  }
}

export async function fetchAnimeFLVHTML(): Promise<string> {
  try {
    const response = await axios.get("https://www3.animeflv.net/", {headers: getDefaultScraperHeaders()});
    return response.data;
  } catch (error) {
    console.error("Error al obtener el HTML de AnimeFLV:", error);
    throw error;
  }
}

export async function parseAnimeFLV(html: string) {
  const $ = cheerio.load(html);
  const animes: ScrapedAnime[] = [];

  const items = $(".ListEpisodios li").toArray();

  for (const el of items) {
    const title = $(el).find("strong.Title").text();
    const relativeUrl = $(el).find("a").attr("href");
    const url = `https://www3.animeflv.net${relativeUrl}`;
    const imgSrc = $(el).find("span.Image img").attr("src");
    const image = `https://www3.animeflv.net${imgSrc}`;
    const episodeText = $(el).find(".Capi").text().trim();
    const episode = extractEpisodeNumber(episodeText);

    // Obtener estado finalizado desde la página del anime
    
    let cleanTitle = title
      .toLowerCase()
      .normalize("NFD")                      // elimina tildes/acentos si los hubiera
      .replace(/[':!.,\-]/g, "")            // elimina caracteres especiales
      .replace(/\s+/g, "-");                // reemplaza espacios por guiones
    
    const finished = await fetchAnimeFLVStatus(`https://www3.animeflv.net/anime/${cleanTitle}`);

    animes.push({
      title,
      url,
      image,
      source: "animeflv",
      episode,
      finished
    });
  }

  return animes;
}
async function fetchAnimeAV1Status(animeUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(animeUrl, {headers: getDefaultScraperHeaders()});
    const $ = cheerio.load(res.data);
    // Buscamos el contenedor que tiene los spans con metadatos
    // Coincidimos por ".text-sm" porque las demás clases pueden variar
    const metaContainer = $(".text-sm.flex.flex-wrap.items-center.gap-2").first();

    if (!metaContainer || metaContainer.length === 0) {
      return false;
    }

    // Obtenemos todos los spans dentro de ese div
    const spans = metaContainer.find("span").toArray();

    if (spans.length === 0) return false;

    // El último span es el estatus del anime
    const lastSpanText = $(spans[spans.length - 1]).text().trim().toLowerCase();
    return lastSpanText.includes("finalizado") || false;
    } catch (err) {
      console.error("Error en fetchAnimeAV1Status:", err);
      return false;
    }
}
export async function fetchAnimeAV1HTML(): Promise<string> {
  try {
      const response = await axios.get("https://animeav1.com/", {headers: getDefaultScraperHeaders()});
      return response.data;
    } catch (error) {
      console.error("Error al obtener el HTML de AnimeAV1:", error);
      throw error;
    }
}

export async function parseAnimeAV1(html: string) {
    const $ = cheerio.load(html);
    const animes: ScrapedAnime[] = [];
    const items = $("article.group\\/item").toArray();

  for (const el of items) {
      const title = $(el).find("header div.text-2xs").text().trim();
      const relativeUrl = $(el).find("a.absolute").attr("href");
      const url = `https://animeav1.com${relativeUrl}`;
      const imgSrc = $(el).find("img.aspect-video").attr("src");
      const image = `${imgSrc}`;
      const episode = parseInt($(el).find("span.font-bold.text-lead").text().trim()) || 0;

      const finished = title ? await fetchAnimeAV1Status(url):false;

      if(title) animes.push({title,url,image,source:"animeav1",episode,finished})
    };

    return animes;
}

export async function fetchOtakusTVHTML(): Promise<string> {
  try {
    const response = await axios.get("https://www.otakustv.net/", {headers: getDefaultScraperHeaders()});
    return response.data;
  } catch (error) {
    console.error("Error al obtener el HTML de OtakusTV:", error);
    throw error;
  }
}

export function parseOtakusTV(html: string) {
    const $ = cheerio.load(html);
    const animes: ScrapedAnime[] = [];
    const firstSection = $("div.ul.x6").first();

    firstSection.find("article.li").each((_, el) => {
      
        const title = $(el).find('h3.h a').text().trim();
        const url = $(el).find("figure.i a").attr("href");
        const imgElement = $(el).find("figure.i a img");
        const image = imgElement.attr("data-src");
        const episodeText = $(el).find("figure.i a u").text().trim();
        const episode = extractEpisodeNumber(episodeText);

        if (title && url && image) {
          animes.push({ title, url, image, source:"otakustv",episode,finished:false});
        }
    });

    return animes;
}