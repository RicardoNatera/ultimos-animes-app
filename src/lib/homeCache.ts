import type { AnimeAlternative, ScrapedAnime } from "@/types/anime";
import { formatRelativeEs } from "@/lib/relativeTime";
import { SOURCES } from "@/types/sourceVars";

const STORAGE_KEY = "pushanime:home";

/** Una lista guardada de hace más de esto ya no se enseña: mejor esperar a la nueva. */
export const HOME_MAX_STALE_MS = 6 * 60 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

type Saved = { v: 1; savedAt: number; animes: ScrapedAnime[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const isSource = (v: unknown): v is ScrapedAnime["source"] =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(SOURCES, v);

const isAlternative = (v: unknown): v is AnimeAlternative =>
  isObject(v) &&
  isSource(v.source) &&
  typeof v.url === "string" &&
  typeof v.setFinishedURL === "string" &&
  typeof v.episode === "number";

const isAnime = (v: unknown): v is ScrapedAnime =>
  isObject(v) &&
  typeof v.title === "string" &&
  typeof v.url === "string" &&
  typeof v.image === "string" &&
  typeof v.episode === "number" &&
  isSource(v.source) &&
  typeof v.finished === "boolean" &&
  typeof v.setFinishedURL === "string" &&
  (v.alternatives === undefined ||
    (Array.isArray(v.alternatives) && v.alternatives.every(isAlternative)));

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Guarda la última lista de episodios para enseñarla al instante la próxima vez. */
export function writeHomeCache(
  animes: ScrapedAnime[],
  now = Date.now(),
  storage: StorageLike | null = browserStorage()
): void {
  if (!storage || animes.length === 0) return;

  const saved: Saved = { v: 1, savedAt: now, animes };

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // sin espacio o bloqueado: no pasa nada, solo no se guarda
  }
}

/**
 * La última lista guardada, o null si no hay, es muy vieja o está dañada.
 * Los "hace X horas" se actualizan con el tiempo que ha pasado desde que se guardó.
 */
export function readHomeCache(
  now = Date.now(),
  storage: StorageLike | null = browserStorage()
): ScrapedAnime[] | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const saved: unknown = JSON.parse(raw);
    if (!isObject(saved) || saved.v !== 1 || typeof saved.savedAt !== "number") return null;
    if (!Array.isArray(saved.animes)) return null;

    const elapsed = now - saved.savedAt;
    if (elapsed < 0 || elapsed > HOME_MAX_STALE_MS) return null;

    const animes = saved.animes.filter(isAnime);
    if (animes.length === 0) return null;

    const elapsedMin = elapsed / 60000;

    return animes.map((anime) =>
      typeof anime.minutesAgo === "number"
        ? {
            ...anime,
            minutesAgo: anime.minutesAgo + elapsedMin,
            agoLabel: formatRelativeEs(anime.minutesAgo + elapsedMin),
          }
        : anime
    );
  } catch {
    return null;
  }
}