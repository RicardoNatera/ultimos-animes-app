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

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

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

function getLocalBroadcastDay(anime: any, fallbackDay: string) {
  const broadcast = anime.broadcast || {};

  // Si no hay datos suficientes → usar el día del request como fallback
  if (!broadcast?.day || !broadcast?.time || !broadcast?.timezone) {
    return { day: fallbackDay, time: "Desconocida" };
  }

  // Mapear día inglés → número (0=Sunday, 6=Saturday)
  const dayMap: Record<string, number> = {
    Sundays: 0,
    Mondays: 1,
    Tuesdays: 2,
    Wednesdays: 3,
    Thursdays: 4,
    Fridays: 5,
    Saturdays: 6,
  };

  const dayNum = dayMap[broadcast.day];
  if (dayNum === undefined) {
    return { day: fallbackDay, time: "Desconocida" };
  }

  // Crear fecha ficticia en JST con ese día y hora
  const base = new Date(Date.UTC(2025, 0, 5 + dayNum, 0, 0)); // semana base estable
  const [hour, minute] = broadcast.time.split(":").map(Number);
  base.setUTCHours(hour - 8, minute, 0, 0); // ajustar desde JST a UTC

  // Convertir a Caracas
  const localDayEnglish = formatInTimeZone(base, "America/Caracas", "EEEE");
  const localTime = formatInTimeZone(base, "America/Caracas", "HH:mm");

  return { day: DAY_TRANSLATION[localDayEnglish], time: localTime };
}

const getPeriod = (timeStr: string): string => {
  if (timeStr === "Desconocida") return "";
  const [hours] = timeStr.split(":").map(Number); 
  return hours >= 12 ? "PM" : "AM";              
};

async function getSchedule(): Promise<ScheduleRecord> {
  const result: ScheduleRecord = {};

  for (const day of DAYS) {
    await sleep(333);

    const url = `https://api.jikan.moe/v4/schedules/${day}?kids=false`;
    const json = await fetchJSONWithRetry(url);
    const data = Array.isArray(json.data) ? json.data : [];

    const filtered = data.filter((anime: any) => {
      const isAllAgesOrChildren =
        anime.rating === "G - All Ages" ||
        anime.rating === "PG - Children";

      let minutes = 0;
      if (anime.duration && typeof anime.duration === "string") {
        const match = anime.duration.match(/(\d+)\s*min/);
        if (match) minutes = parseInt(match[1], 10);
      }

      return !isAllAgesOrChildren && (minutes === 0 || minutes >= 5);
    });

    const dayMap = new Map<string, any>();

    for (const anime of filtered) {
      const fallbackDay = DAY_TRANSLATION[
        day.charAt(0).toUpperCase() +
        day.slice(1).toLowerCase()
      ];
      const localBroadcast = getLocalBroadcastDay(anime, fallbackDay);

      if (!result[localBroadcast.day]) result[localBroadcast.day] = [];

      if (!dayMap.has(anime.title)) {
        const animeData = {
          title: anime.title,
          url: anime.url,
          image:
            anime.images?.jpg?.image_url ||
            anime.images?.webp?.image_url ||
            "",
          type: anime.type,
          episodes: anime.episodes,
          status: anime.status,
          score: anime.score,
          broadcastTime:localBroadcast.time,
          period: getPeriod(localBroadcast.time),
        };

        dayMap.set(anime.title, animeData);
        result[localBroadcast.day].push(animeData);
      }
    }
  }

  Object.keys(result).forEach(day => {
    result[day].sort((a: any, b: any) => {
      // Convertir "HH:mm" a minutos totales para comparar numéricamente
      const timeToMinutes = (timeStr: string): number => {
        if (timeStr === "Desconocida") return 0;
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };
      
      return timeToMinutes(a.broadcastTime) - timeToMinutes(b.broadcastTime);
    });
  });

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
