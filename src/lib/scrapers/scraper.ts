import axios from "axios";
import * as cheerio from 'cheerio';
import { ScrapedAnime } from "@/types/anime";
import { formatInTimeZone } from "date-fns-tz";

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

export async function fetchOtakusTVStatus(animeUrl: string): Promise<boolean> {
  try {
    const res = await axios.get(animeUrl, {headers: getDefaultScraperHeaders()});
    const $ = cheerio.load(res.data);
    
    const statusText = $(".st").text().toLowerCase();
    // Ejemplo: "en emision" o "finalizado"
    return statusText.includes("finalizado");
  } catch (err) {
    console.error(`Error obteniendo estado de ${animeUrl}`, err);
    return false; // Por defecto no finalizado si hubo error
  }
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
          let t = url;
          t = t.slice(0, t.lastIndexOf("-"));
          let result = t.slice(t.lastIndexOf("/") + 1);
          animes.push({ title, url, image, source:"otakustv",episode,finished:false,setFinishedURL:`https://www.otakustv.net/anime/${result}`});
        }
    });

    return animes;
}

// schedule.ts

type AnimeInfo = { title: string; url: string; image: string; type: string; episodes: number ; status: string; score: number, broadcastTime:string, period: string, };
type ScheduleRecord = Record<string, AnimeInfo[]>;

const DAY_TRANSLATION: Record<string, string> = {
  Sunday: "Domingo",
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSONWithRetry(
  url: string,
  retries = 3,
  baseDelayMs = 500 
): Promise<any> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url);
    if (res.status === 429) {
      if (attempt >= retries) {
        throw new Error(`429 after ${retries} retries: ${url}`);
      }
      const wait = baseDelayMs * (attempt + 1); 
      console.warn(`Rate limited on ${url}, retrying in ${wait}ms...`);
      await sleep(wait);
      attempt++;
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return res.json();
  }
}
function normalizeBroadcastDay(day: string) {
  return day.replace(/s$/i, "");
}

function getLocalBroadcastDay(broadcast: { day?: string; time?: string; timezone?: string },fallbackDay: string) {
  
  if (!broadcast.day || !broadcast.time || !broadcast.timezone) {
    return { day: fallbackDay, time: "Desconocida" };
  }

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const normalizedDay = normalizeBroadcastDay(broadcast.day);
  const dayNum = dayMap[normalizedDay];

  if (dayNum === undefined) {
    return { day: fallbackDay, time: "Desconocida" };
  }

  const [hour, minute] = broadcast.time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { day: fallbackDay, time: "Desconocida" };
  }

  const jstDate = new Date(Date.UTC(2025, 0, 5 + dayNum, hour - 9, minute));
  const caracasDayEnglish = formatInTimeZone(jstDate, "America/Caracas", "EEEE");
  const caracasTime = formatInTimeZone(jstDate, "America/Caracas", "HH:mm");

  const [caracasHour, caracasMinute] = caracasTime.split(":").map(Number);
  const adjustedMinutes = caracasHour * 60 + caracasMinute + 60;

  const finalHour = Math.floor((adjustedMinutes / 60) % 24);
  const finalMinute = adjustedMinutes % 60;
  const finalTime = `${String(finalHour).padStart(2, "0")}:${String(finalMinute).padStart(2, "0")}`;

  return {
    day: DAY_TRANSLATION[caracasDayEnglish],
    time: finalTime,
  };
}

const getPeriod = (timeStr: string): string => {
  if (timeStr === "Desconocida") return "";
  const [hours] = timeStr.split(":").map(Number); 
  return hours >= 12 ? "PM" : "AM";              
};

async function fetchAllSchedulePages(): Promise<any[]> {
  let allData: any[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    await sleep(333); 
    
    const url = `https://api.jikan.moe/v4/schedules?kids=false&page=${page}`;
    const json = await fetchJSONWithRetry(url);
    
    if (!Array.isArray(json.data)) {
      console.warn(`Página ${page} sin data válida, deteniendo paginación`);
      break;
    }

    allData.push(...json.data);
    
    const pagination = json.pagination;
    hasNextPage = pagination.has_next_page;
    page++;    
  }

  return allData;
}

async function getSchedule(): Promise<ScheduleRecord> {
  const result: ScheduleRecord = {};
  const seen = new Set<number>();

  const allAnimes = await fetchAllSchedulePages();

  for (const anime of allAnimes) {
    const isAllAgesOrChildren =
      anime.rating === "G - All Ages" ||
      anime.rating === "PG - Children";

    let minutes = 0;
    if (typeof anime.duration === "string") {
      const match = anime.duration.match(/(\d+)\s*min/);
      if (match) minutes = Number(match[1]);
    }

    if (isAllAgesOrChildren || (minutes !== 0 && minutes < 5)) continue;
    if (!anime.broadcast?.day || !anime.broadcast?.time || !anime.broadcast?.timezone) continue;
    if (seen.has(anime.mal_id)) continue;

    const fallbackDay = "Desconocida";
    const localBroadcast = getLocalBroadcastDay(anime.broadcast, fallbackDay);

    const animeData: AnimeInfo = {
      title: anime.title,
      url: anime.url,
      image: anime.images?.jpg?.image_url || anime.images?.webp?.image_url || "",
      type: anime.type,
      episodes: anime.episodes,
      status: anime.status,
      score: anime.score,
      broadcastTime: localBroadcast.time,
      period: getPeriod(localBroadcast.time),
    };

    seen.add(anime.mal_id);

    if (!result[localBroadcast.day]) result[localBroadcast.day] = [];
    result[localBroadcast.day].push(animeData);
  }

  for (const day of Object.keys(result)) {
    result[day].sort((a, b) => {
      const toMinutes = (t: string) => {
        if (t === "Desconocida") return 0;
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      return toMinutes(a.broadcastTime) - toMinutes(b.broadcastTime);
    });
  }
  
  return result;
}
export async function fetchSchedule() {
  try {
    const schedule = await getSchedule();
    return Response.json({ success: true, schedule });
  } catch (error) {
    console.error("Error scraping schedule:", error);
    return Response.json({ success: false, error: "Error al obtener el horario" }, { status: 500 });
  }
}
