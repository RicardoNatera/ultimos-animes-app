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

export async function fetchAnimeFLVStatus(animeUrl: string): Promise<boolean> {
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
      .replace("½","12")
      .replace("(","")
      .replace(")","")
      .replace(/\s+/g, "-")                // reemplaza espacios por guiones   

    animes.push({
      title,
      url,
      image,
      source: "animeflv",
      episode,
      finished:false,
      setFinishedURL:`https://www3.animeflv.net/anime/${cleanTitle}`
    });
  }

  return animes;
}
export async function fetchAnimeAV1Status(animeUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(animeUrl, {headers: getDefaultScraperHeaders()});
    const $ = cheerio.load(res.data);
    
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

      if(title) animes.push({title,url,image,source:"animeav1",episode,finished:false,setFinishedURL:url})
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
          animes.push({ title, url, image, source:"otakustv",episode,finished:false,setFinishedURL:""});
        }
    });

    return animes;
}

export async function fetchSchedule() {
  try {
    const { data: html } = await axios.get("https://www.animecount.com/calendario", {
      headers:{
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        "Accept-Language":	'es-ES,es;q=0.9',
        "Cookie":"user_identifier=eyJpdiI6IkhpQUZnV1hKYzdTSHFuUitYM29hd2c9PSIsInZhbHVlIjoiK2JxUTlJanI1ZFhSdTUxTnQySXBjMjFiVkVodkhibkh4SmZkZ2QxSnJMbXdjbStlS3VmQ3JSU3hQNDZTQUdVLzgybTQxTzk0aW5GYzF3ZnEwdVBCc1E9PSIsIm1hYyI6IjViYjJhYzFlZWNjODA4MWEwMGQ1ZjVhMTNiMWFlNjAyZWQxMDEzZDdkNGM1MzNlMmU2NmZjNzRkMjYyMzg1YjMiLCJ0YWciOiIifQ%3D%3D; XSRF-TOKEN=eyJpdiI6Ims5bWs0RXpzbEJINEVYVHdnS2xIYmc9PSIsInZhbHVlIjoiK2pkcGx2L2JpemYwU25XcFhrZjNrRlUvb2dMM29jVzhJd3dHcVVDWjdFaktFVjJxZ3pFR20ya05EN0NWY0xTNkF6bnBaZzB5czRoVDlOdU5jR1lJRXppYXZzRlVKRlpEYjdtTmNZRDVseUFlNUxmdktDQXpxWjlKNnNOWnR6U3UiLCJtYWMiOiJjNmQzOTcwMDI0OTY4NDUzZDEzN2FlODg0ZWQ0MWJjYWFlMjRhYjZmN2UwZmFmYjM2N2Q0ZDkwMWRlMjhjZTIzIiwidGFnIjoiIn0%3D; anime-count-session=eyJpdiI6Ii9BSERmUndJK1g1eVdsQTNpaDhydnc9PSIsInZhbHVlIjoiaHpXbzBrV3locW11ZjVQakcrNkQzbUhFOFFsZ0Rtc0lkd3pyK1RlQUVnN25CTUNRdnEzN2xBNzhBSGZRNUZQVjFaaVdMWnNmdU9SWVZJWkNxS1R3ZHd6OFVyZEFHeU1WSGh4UFdEUTFtcHZCRkNZOWMvaGRXVmliREpDT3hIOGYiLCJtYWMiOiIwMmU3ODc5ZjVmMDU5OWRkZjg3ODlmOThlZDJkYThiYjNiNzIxYWFlNTVlMjJmZjUzNDVmNTVlZWM1ZDRjMTFlIiwidGFnIjoiIn0%3D; cf_clearance=uo4P4JzJswGbRS3D5FUfZJfx0mXK5Rz_.o3ED.J5s9k-1764555245-1.2.1.1-4RlPRtkyyIrV8dKSB0W3SUVl0cFw0Rn2x09A32QmBdEMaYoE8vr9rO09FER4p79Go4KyHx4iQds.LXn0izWTgQ8cxm0vyEeKa.6GdZ5SlcQMV4sjhm3c73HJLE6o9GeCj0Jxm4U64PJnvS52bULNWW6AP_wnaUlffLdTJk5LpK.YIvM5OVku3fZ5Cgc5OxLdhinaJv404hx7nxix3KNLDJ2uRWbYjQ1MyYj3muAHwq0",
        'Priority':	"u=0, i",
        'Sec-Ch-Ua'	:'"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'Sec-Ch-Ua-Mobile':	"?1",
        'Sec-Ch-Ua-Platform':	"Android",
        'Sec-Fetch-Dest':	"document",
        'Sec-Fetch-Mode':	"navigate",
        "Sec-Fetch-Site":"none",
        'Sec-Fetch-User':	"?1",
        'Upgrade-Insecure-Requests':	"1",
        'User-Agent'	:'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      },
    });

    const $ = cheerio.load(html);
    const result: Record<
      string,
      { title: string; url: string; image: string }[]
    > = {};
    
    
    $('section.bg-white').each((_, section) => {
      
      const day = $(section).find('h2 span').first().text().trim();
      if(day)
        result[day] = [];
      
      $(section).find('a.group').each((_, animeEl) => {
        if(day){
          const title = $(animeEl).find('h3').text().trim();
          const url = $(animeEl).attr('href') || "";
          const image = $(animeEl).find('img').attr('src')  || "";
            
          result[day].push({
            title,
            url,
            image,
          });
        }
      });
    });

    return Response.json({
      success: true,
      schedule: result,
    });
  } catch (error) {

    console.error("Error scraping animecount:", error);
    return Response.json(
      { success: false, error: "Error al obtener datos de animecount" },
      { status: 500 }
    );
  }
}
