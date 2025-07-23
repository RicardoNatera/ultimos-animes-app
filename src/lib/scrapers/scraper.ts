import axios from "axios";
import * as cheerio from 'cheerio';

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
    const animes: { title: string; url: string; image: string; source: "animeflv" | "animeav1" | "otakustv" }[] = [];
    $(".ListEpisodios li").each((_, el) => {
        const title = $(el).find("strong.Title").text();
        const relativeUrl = $(el).find("a").attr("href");
        const url = `https://www3.animeflv.net${relativeUrl}`;
        const imgSrc = $(el).find("span.Image img").attr("src");
        const image = `https://www3.animeflv.net${imgSrc}`;

        animes.push({title,url,image,source:"animeflv"})
    });

    return animes;
}

export async function fetchAnimeAV1HTML(): Promise<string> {
  try {
      const response = await axios.get("https://animeav1.com/");
      return response.data;
    } catch (error) {
      console.error("Error al obtener el HTML de AnimeFLV:", error);
      throw error;
    }
}

export function parseAnimeAV1(html: string) {
    const $ = cheerio.load(html);
    const animes: { title: string; url: string; image: string; source: "animeflv" | "animeav1" | "otakustv" }[] = [];
    $("article.group\\/item").each((_, el) => {
        const title = $(el).find("header div.text-2xs").text().trim();
        const relativeUrl = $(el).find("a.absolute").attr("href");
        const url = `https://animeav1.com${relativeUrl}`;
        const imgSrc = $(el).find("img.aspect-video").attr("src");
        const image = `${imgSrc}`;
        if(title) animes.push({title,url,image,source:"animeav1"})
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
    const animes: { title: string; url: string; image: string; source: "animeflv" | "animeav1" | "otakustv" }[] = [];
    $("div.pre").each((_, el) => {
        const title = $(el).find('h2 a').text().trim();
        const url = $(el).find('a').first().attr('href');
        const imgElement = $(el).find('img');
        const image = imgElement.attr('data-src') || imgElement.attr('src');

        if (title && url && image) {
          animes.push({ title, url, image, source:"otakustv" });
        }
    });

    return animes;
}