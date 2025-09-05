import axios from "axios";
import * as cheerio from 'cheerio';
import { ScrapedAnime } from "@/types/anime";

export function extractEpisodeNumber(text: string): number {
  const match = text.match(/\d+/); // busca el primer número en la cadena
  return match ? parseInt(match[0], 10) : 0; // si no encuentra, retorna 0
}

export async function fetchAnimeFLVHTML(): Promise<string> {
  try {
    const response = await axios.get("https://www3.animeflv.net/");
    return response.data;
  } catch (error) {
    console.error("Error al obtener el HTML de AnimeFLV:", error);
    throw error;
  }
}

export function parseAnimeFLV(html: string) {
    const $ = cheerio.load(html);
    const animes: ScrapedAnime[] = [];
    $(".ListEpisodios li").each((_, el) => {
        const title = $(el).find("strong.Title").text();
        const relativeUrl = $(el).find("a").attr("href");
        const url = `https://www3.animeflv.net${relativeUrl}`;
        const imgSrc = $(el).find("span.Image img").attr("src");
        const image = `https://www3.animeflv.net${imgSrc}`;
        const episodeText = $(el).find(".Capi").text().trim();
        const episode = extractEpisodeNumber(episodeText);

        animes.push({title,url,image,source:"animeflv",episode})
    });

    return animes;
}

export async function fetchAnimeAV1HTML(): Promise<string> {
  try {
      const response = await axios.get("https://animeav1.com/",{
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          "Referer": "https://google.com",
          "Cache-Control": "no-cache",
        },
      });
      console.log("pase")
      return response.data;
    } catch (error) {
      console.error("Error al obtener el HTML de AnimeAV1:", error);
      throw error;
    }
}

export function parseAnimeAV1(html: string) {
    const $ = cheerio.load(html);
    const animes: ScrapedAnime[] = [];
    $("article.group\\/item").each((_, el) => {
        const title = $(el).find("header div.text-2xs").text().trim();
        const relativeUrl = $(el).find("a.absolute").attr("href");
        const url = `https://animeav1.com${relativeUrl}`;
        const imgSrc = $(el).find("img.aspect-video").attr("src");
        const image = `${imgSrc}`;
        const episode = parseInt($(el).find("span.font-bold.text-lead").text().trim()) || 0;
        if(title) animes.push({title,url,image,source:"animeav1",episode})
    });

    return animes;
}

export async function fetchOtakusTVHTML(): Promise<string> {
  try {
    const response = await axios.get("https://www1.otakustv.com/");
    return response.data;
  } catch (error) {
    console.error("Error al obtener el HTML de OtakusTV:", error);
    throw error;
  }
}

export function parseOtakusTV(html: string) {
    const $ = cheerio.load(html);
    const animes: ScrapedAnime[] = [];
    $("div.pre").each((_, el) => {
        const title = $(el).find('h2 a').text().trim();
        const url = $(el).find('a').first().attr('href');
        const imgElement = $(el).find('img');
        const image = imgElement.attr('data-src') || imgElement.attr('src');
        const episodeText = $(el).find(".bog").text().trim();
        const episode = extractEpisodeNumber(episodeText);

        if (title && url && image) {
          animes.push({ title, url, image, source:"otakustv",episode});
        }
    });

    return animes;
}