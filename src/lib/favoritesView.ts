import type { Favorite } from "@/lib/favorites";
import type { Info, InfoMap } from "@/lib/favoritesInfo";
import { normalizeKey } from "@/lib/titles";

export const STATUS_FILTERS = ["all", "airing", "upcoming", "finished"] as const;
export const SORT_MODES = ["recent", "day", "title", "score"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortMode = (typeof SORT_MODES)[number];

export type FavoritesView = { status: StatusFilter; sort: SortMode };

export const DEFAULT_VIEW: FavoritesView = { status: "all", sort: "recent" };

export function isFavoritesView(value: unknown): value is FavoritesView {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (STATUS_FILTERS as readonly unknown[]).includes(v.status) &&
    (SORT_MODES as readonly unknown[]).includes(v.sort)
  );
}

// Mismos nombres que devuelve el servidor (en hora de Venezuela), empezando por lunes
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Día de la semana de hoy en Venezuela (0 = lunes … 6 = domingo). */
export function currentDayIndex(now = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    weekday: "long",
  }).format(now);

  return WEEKDAYS_EN.indexOf(name);
}

/** Estado de emisión según MAL, o null si no hay datos. */
export function statusOf(info: Info | null | undefined): Exclude<StatusFilter, "all"> | null {
  switch (info?.mal?.status) {
    case "Currently Airing":
      return "airing";
    case "Not yet aired":
      return "upcoming";
    case "Finished Airing":
      return "finished";
    default:
      return null;
  }
}

/**
 * Día y hora de emisión, solo para lo que está en emisión o por estrenar
 * (en los terminados MAL conserva el horario antiguo y no sirve para ordenar).
 */
function scheduleOf(info: Info | null | undefined, today: number) {
  const status = statusOf(info);
  const mal = info?.mal;
  if ((status !== "airing" && status !== "upcoming") || !mal?.day || !mal.broadcastTime) {
    return null;
  }

  const day = DAYS.indexOf(mal.day);
  if (day < 0) return null;

  // Días que faltan desde hoy: hoy = 0, mañana = 1…
  return { offset: (day - today + 7) % 7, time: mal.broadcastTime };
}

/**
 * Aplica búsqueda, filtro de estado y orden.
 * Lo que no tiene datos de MAL no aparece al filtrar por estado y queda
 * al final al ordenar por día o por puntuación.
 */
export function applyView(
  favorites: Favorite[],
  info: InfoMap,
  view: FavoritesView,
  query: string,
  today: number
): Favorite[] {
  const q = normalizeKey(query);

  const list = favorites.filter((fav) => {
    if (q) {
      const malTitle = info[fav.key]?.mal?.title ?? "";
      if (!normalizeKey(fav.title).includes(q) && !normalizeKey(malTitle).includes(q)) {
        return false;
      }
    }

    if (view.status !== "all" && statusOf(info[fav.key]) !== view.status) return false;

    return true;
  });

  const byRecent = (a: Favorite, b: Favorite) => b.addedAt - a.addedAt;

  switch (view.sort) {
    case "title":
      return list.sort((a, b) =>
        a.title.localeCompare(b.title, "es", { sensitivity: "base" })
      );

    case "score":
      return list.sort((a, b) => {
        const sa = info[a.key]?.mal?.score ?? null;
        const sb = info[b.key]?.mal?.score ?? null;
        if (sa !== null && sb !== null) return sb - sa || byRecent(a, b);
        if (sa !== null) return -1;
        if (sb !== null) return 1;
        return byRecent(a, b);
      });

    case "day":
      return list.sort((a, b) => {
        const sa = scheduleOf(info[a.key], today);
        const sb = scheduleOf(info[b.key], today);
        if (sa && sb) {
          return sa.offset - sb.offset || sa.time.localeCompare(sb.time) || byRecent(a, b);
        }
        if (sa) return -1;
        if (sb) return 1;
        return byRecent(a, b);
      });

    default:
      return list.sort(byRecent);
  }
}