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

// ===============================
// MyAnimeList Schedule Scraper
// ===============================

type MALScheduleAnime = {
  malId: number;
  title: string;
  url: string;
  image: string;
  day: string;
};

type MALAnimeDetails = {
  title: string;
  url: string;
  image: string;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  rating: string | null;
  duration: string | null;
  broadcast: string | null;
  aired: string | null;
};

const MAL_SCHEDULE_URL =
  "https://myanimelist.net/anime/season/schedule";

const DAY_TRANSLATION: Record<string, string> = {
  Sunday: "Domingo",
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

const MAL_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET a una página de MAL con reintentos.
 * Reintenta ante 429, errores 5xx y fallos de red/timeout.
 */
async function fetchMALPage(
  url: string,
  timeout = 10000,
  retries = 2
): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await axios.get<string>(url, {
        headers: getDefaultScraperHeaders(),
        timeout,
      });

      return response.data;
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;

      const retryable =
        axiosError !== null &&
        (status === undefined || status === 429 || status >= 500);

      if (!retryable || attempt >= retries) {
        throw error;
      }

      // Si MAL indica cuánto esperar, lo respetamos (máx. 5 s)
      const retryAfter = Number(axiosError?.response?.headers?.["retry-after"]);

      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 500 * 2 ** attempt + Math.random() * 250;

      console.warn(
        `MAL ${status ?? "sin respuesta"} en ${url}. Reintento ${attempt + 1}/${retries} en ${Math.round(delay)} ms`
      );

      await sleep(delay);
    }
  }
}

/**
 * Obtiene el HTML del calendario semanal de MyAnimeList.
 */
async function fetchMALScheduleHTML(): Promise<string> {
  return fetchMALPage(MAL_SCHEDULE_URL, 15000);
}

/**
 * Extrae los anime de:
 *
 * https://myanimelist.net/anime/season/schedule
 *
 * El calendario de MAL agrupa los anime por día.
 */
function parseMALSchedule(html: string): MALScheduleAnime[] {
  const $ = cheerio.load(html);

  const animes: MALScheduleAnime[] = [];
  const seen = new Set<number>();

  for (const day of MAL_DAYS) {
    const dayContainer = $(
      `.js-seasonal-anime-list-key-${day}`
    ).first();

    if (!dayContainer.length) {
      console.warn(
        `No se encontró el contenedor de MAL para ${day}`
      );
      continue;
    }

    const cards = dayContainer
      .find(".seasonal-anime")
      .toArray();

    for (const element of cards) {
      const card = $(element);

      // MAL marca los anime infantiles con la clase "kids".
      // Los excluimos para mantener el comportamiento anterior
      // de Jikan (?kids=false).
      if (card.hasClass("kids")) {
        continue;
      }

      const titleLink = card
        .find("h2 a")
        .first();

      if (!titleLink.length) {
        continue;
      }

      const title = titleLink.text().trim();
      const url = titleLink.attr("href");

      if (!title || !url) {
        continue;
      }

      const malIdMatch = url.match(/\/anime\/(\d+)/);

      if (!malIdMatch) {
        console.warn(
          `No se pudo obtener MAL ID de: ${url}`
        );
        continue;
      }

      const malId = Number(malIdMatch[1]);

      if (seen.has(malId)) {
        continue;
      }

      let image =
        card.find("div.image img").attr("src") ||
        card.find("div.image img").attr("data-src") ||
        "";

      // Algunas imágenes pueden venir en data-src.
      if (!image) {
        image =
          card.find("img").attr("data-src") ||
          card.find("img").attr("src") ||
          "";
      }

      seen.add(malId);

      animes.push({
        malId,
        title,
        url,
        image,
        day,
      });
    }
  }

  return animes;
}

/**
 * Obtiene el valor de un campo de información
 * de la página individual de MAL.
 *
 * Ejemplo:
 *
 * <span>Broadcast:</span>
 * Mondays at 00:00 (JST)
 */
function getMALInfoValue(
  $: cheerio.CheerioAPI,
  label: string
): string | null {
  const labelNode = $("span")
    .filter((_, element) => {
      return $(element).text().trim() === label;
    })
    .first();

  if (!labelNode.length) {
    return null;
  }

  const parent = labelNode.parent();

  if (!parent.length) {
    return null;
  }

  const value = parent
    .text()
    .replace(label, "")
    .replace(/\s+/g, " ")
    .trim();

  return value || null;
}

/**
 * Obtiene la información detallada de un anime de MAL.
 */
async function fetchMALAnimeDetails(
  malId: number
): Promise<MALAnimeDetails> {
  const url = `https://myanimelist.net/anime/${malId}`;
  const html = await fetchMALPage(url);

  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";

  const image =
    $('meta[property="og:image"]').attr("content") ||
    "";
  const type =
    getMALInfoValue($, "Type:") ||
    "TV";

  const episodesText =
    getMALInfoValue($, "Episodes:");

  const episodes =
    episodesText &&
    episodesText !== "Unknown" &&
    /^\d+$/.test(episodesText)
      ? Number(episodesText)
      : null;

  const status =
    getMALInfoValue($, "Status:") ||
    "Unknown";

  const scoreElement = $(
    'span[itemprop="ratingValue"]'
  ).first();

  const scoreText = scoreElement
    .text()
    .trim();

  const score =
    scoreText &&
    scoreText !== "N/A" &&
    !Number.isNaN(Number(scoreText))
      ? Number(scoreText)
      : null;

  const rating =
    getMALInfoValue($, "Rating:");

  const duration =
    getMALInfoValue($, "Duration:");

  const broadcast =
    getMALInfoValue($, "Broadcast:");
  
  const aired = 
    getMALInfoValue($, "Aired:");

  return {
    title,
    url: url,
    image,
    type,
    episodes,
    status,
    score,
    rating,
    duration,
    broadcast,
    aired,
  };
}

/**
 * Convierte:
 *
 * Mondays at 00:00 (JST)
 *
 * en:
 *
 * { day: "Monday", time: "00:00" }
 */
function parseMALBroadcast(
  broadcast: string | null
): {
  day: string;
  time: string;
} | null {
  if (!broadcast) {
    return null;
  }

  const match = broadcast.match(
    /^(Sundays?|Mondays?|Tuesdays?|Wednesdays?|Thursdays?|Fridays?|Saturdays?)\s+at\s+(\d{1,2}):(\d{2})/i
  );

  if (!match) {
    return null;
  }

  const day = match[1].replace(/s$/i, "");

  const time = `${match[2].padStart(2, "0")}:${match[3]}`;

  return {
    day,
    time,
  };
}

/**
 * Convierte el horario japonés a la zona horaria
 * que utiliza actualmente tu aplicación.
 *
 * Tu código anterior utilizaba America/Caracas,
 * así que mantenemos ese comportamiento.
 */
function getLocalBroadcastDay(
  broadcast: string | null,
  fallbackDay: string
) {
  const parsed = parseMALBroadcast(broadcast);

  if (!parsed) {
    return {
      day: fallbackDay,
      time: "Desconocida",
    };
  }

  const dayNum = WEEKDAY_INDEX[parsed.day];

  if (dayNum === undefined) {
    return {
      day: fallbackDay,
      time: "Desconocida",
    };
  }

  const [hour, minute] = parsed.time
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return {
      day: fallbackDay,
      time: "Desconocida",
    };
  }

  /*
   * Usamos una semana fija únicamente para poder
   * hacer la conversión de zona horaria.
   *
   * El 5 de enero de 2025 fue domingo.
   */
  const jstDate = new Date(
    Date.UTC(
      2025,
      0,
      5 + dayNum,
      hour - 9,
      minute
    )
  );

  const localDay = formatInTimeZone(
    jstDate,
    "America/Caracas",
    "EEEE"
  );

  const localTime = formatInTimeZone(
    jstDate,
    "America/Caracas",
    "HH:mm"
  );

  return {
    day: DAY_TRANSLATION[localDay] || fallbackDay,
    time: localTime,
  };
}

const getPeriod = (
  timeStr: string
): string => {
  if (timeStr === "Desconocida") {
    return "";
  }

  const [hours] = timeStr
    .split(":")
    .map(Number);

  return hours >= 12 ? "PM" : "AM";
};

/**
 * Fase 1: solo la lista de MAL (rápida, 1 petición).
 */

/**
 * "Oct 5, 2026 to ?"  ->  "Oct 5, 2026"
 * Devuelve null si MAL no tiene fecha.
 */
function parseAiredStart(aired: string | null): string | null {
  if (!aired) return null;
  const start = aired.split(" to ")[0].trim();
  if (!start || start === "?" || start === "Not available") return null;
  return start;
}
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Combina la fecha "Aired" (JST) con la hora de "Broadcast" (JST)
 * y la convierte a America/Caracas.
 *
 * "Oct 3, 2026" + "Saturdays at 01:53 (JST)"  ->  "2026-10-02"
 *
 * - Fecha completa  -> devuelve "yyyy-MM-dd" (ya convertida)
 * - Solo mes/año    -> devuelve el texto original (no se puede convertir)
 */
function getLocalAiredDate(
  aired: string | null,
  broadcast: string | null
): string | null {
  const start = parseAiredStart(aired);
  if (!start) return null;

  const full = start.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  if (!full || MONTH_INDEX[full[1]] === undefined) {
    return start; // formato parcial: se muestra tal cual
  }

  const year = Number(full[3]);
  const month = MONTH_INDEX[full[1]];
  const day = Number(full[2]);

  const parsed = parseMALBroadcast(broadcast);
  const [hour, minute] = parsed
    ? parsed.time.split(":").map(Number)
    : [0, 0];

  // JST = UTC+9. Date.UTC maneja bien las horas negativas
  // (retrocede al día anterior automáticamente).
  const utcDate = new Date(Date.UTC(year, month, day, hour - 9, minute));

  return formatInTimeZone(utcDate, "America/Caracas", "yyyy-MM-dd");
}

/**
 * Primera fecha (desde "Aired") que cae en el día de la semana del Broadcast,
 * convertida a America/Caracas.
 *
 * "Oct 3, 2026" + "Mondays at 23:30 (JST)"  ->  "2026-10-05"
 *
 * Si hay streaming anticipado, "Aired" es anterior a la primera emisión
 * en TV y esta función devuelve la fecha de esa primera emisión.
 */
function getFirstBroadcastDate(
  aired: string | null,
  broadcast: string | null
): string | null {
  const start = parseAiredStart(aired);
  if (!start) return null;

  const full = start.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
  if (!full || MONTH_INDEX[full[1]] === undefined) return null;

  const parsed = parseMALBroadcast(broadcast);
  if (!parsed) return null;

  const target = WEEKDAY_INDEX[parsed.day];
  if (target === undefined) return null;

  const [hour, minute] = parsed.time.split(":").map(Number);

  const year = Number(full[3]);
  const month = MONTH_INDEX[full[1]];
  const day = Number(full[2]);

  // Días que faltan (0-6) desde la fecha "Aired" hasta el día de emisión
  const airedWeekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  const diff = (target - airedWeekday + 7) % 7;

  const utcDate = new Date(
    Date.UTC(year, month, day + diff, hour - 9, minute)
  );

  return formatInTimeZone(utcDate, "America/Caracas", "yyyy-MM-dd");
}
type ScheduleListItem = {
  malId: number;
  title: string;
  image: string;
  day: string;
};

const LIST_TTL_MS = 60 * 60 * 1000; // 1 hora

let listCache: { at: number; animes: ScheduleListItem[] } | null = null;
let listInFlight: Promise<ScheduleListItem[]> | null = null;

export async function getScheduleList(): Promise<ScheduleListItem[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) {
    return listCache.animes;
  }

  // Si ya hay una petición en curso, todos esperan la misma
  if (!listInFlight) {
    listInFlight = (async () => {
      const html = await fetchMALScheduleHTML();

      const animes = parseMALSchedule(html).map(
        ({ malId, title, image, day }) => ({
          malId,
          title,
          image,
          day:
            DAY_TRANSLATION[day.charAt(0).toUpperCase() + day.slice(1)] ??
            "Desconocida",
        })
      );

      // No cacheamos una lista vacía (MAL pudo cambiar o fallar)
      if (animes.length > 0) {
        listCache = { at: Date.now(), animes };
      }

      return animes;
    })().finally(() => {
      listInFlight = null;
    });
  }

  return listInFlight;
}

/**
 * Indica si un MAL ID forma parte de la lista actual del calendario.
 */
export async function isScheduledAnime(malId: number): Promise<boolean> {
  const list = await getScheduleList();
  return list.some((anime) => anime.malId === malId);
}

/**
 * Fase 2: detalle de un anime (1 petición a su ficha de MAL).
 * Devuelve null si hay que descartarlo.
 */
export async function getScheduleItem(malId: number) {
  const details = await fetchMALAnimeDetails(malId);

  if (details.rating === "G - All Ages" || details.rating === "PG - Children") {
    return null;
  }
  if (!details.broadcast) return null;

  const local = getLocalBroadcastDay(details.broadcast, "Desconocida");
  if (local.time === "Desconocida") return null;

  return {
    day: local.day,
    title: details.title,
    url: details.url,
    image: details.image,
    type: details.type,
    episodes: details.episodes,
    status: details.status,
    score: details.score,
    airedFrom: getLocalAiredDate(details.aired, details.broadcast),
    firstBroadcast: getFirstBroadcastDate(details.aired, details.broadcast),
    broadcastTime: local.time,
    period: getPeriod(local.time),
  };
}