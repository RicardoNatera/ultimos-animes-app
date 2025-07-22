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
    console.log($)
    const animes: { title: string; url: string; image: string }[] = [];
    $(".ListEpisodios li").each((_, el) => {
        const title = $(el).find("strong.Title").text();
        const relativeUrl = $(el).find("a").attr("href");
        const url = `https://www3.animeflv.net${relativeUrl}`;
        const imgSrc = $(el).find("span.Image img").attr("src");
        const image = `https://www3.animeflv.net${imgSrc}`;

        animes.push({title,url,image})
    });

    return animes;
}