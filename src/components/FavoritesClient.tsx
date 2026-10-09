"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Search, Star } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import StatusBadge from "@/components/StatusBadge";
import {
  MAX_FAVORITES_BYTES,
  favoritesBytes,
  formatBytes,
  useFavorites,
  useFavoritesView,
  useHydrated,
} from "@/lib/favorites";
import { useFavoritesInfo } from "@/lib/favoritesInfo";
import {
  applyView,
  currentDayIndex,
  type FavoritesView,
  type SortMode,
  type StatusFilter,
} from "@/lib/favoritesView";
import { pageNumbers } from "@/lib/pagination";
import {
  FAVORITE_SOURCES,
  SOURCE_ICONS,
  getSourceSearchUrl,
  type SourceName,
} from "@/types/sourceVars";

const PAGE_SIZE = 25;

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "airing", label: "En emisión" },
  { value: "upcoming", label: "Próximamente" },
  { value: "finished", label: "Finalizados" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Último agregado" },
  { value: "day", label: "Día de emisión (desde hoy)" },
  { value: "title", label: "A–Z" },
  { value: "score", label: "Mejor puntuación" },
];

const SOURCE_LABEL: Record<SourceName, string> = {
  animeav1: "AnimeAV1",
  otakustv: "OtakusTV",
  animeflv: "AnimeFLV",
};

export default function FavoritesClient() {
  const hydrated = useHydrated();
  const { favorites } = useFavorites();
  const [view, setView] = useFavoritesView();
  const { info, load, prune, pending, cacheBytes } = useFavoritesInfo();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const today = useMemo(() => currentDayIndex(), []);

  // Búsqueda + filtro de estado + orden (sobre TODOS los favoritos)
  const filtered = useMemo(
    () => applyView(favorites, info, view, query, today),
    [favorites, info, view, query, today]
  );

  // Paginación (si se quitan favoritos y la página deja de existir, se ajusta)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  // Filtrar por estado u ordenar por día/puntuación necesita los datos de todos
  const needsAll =
    view.status !== "all" || view.sort === "day" || view.sort === "score";

  // Borra de la caché lo de favoritos eliminados (solo cuando ya se leyó localStorage)
  useEffect(() => {
    if (hydrated) prune(new Set(favorites.map((f) => f.key)));
  }, [hydrated, favorites, prune]);

  // Pide la info: primero la página actual; con filtro u orden activo, también el resto
  useEffect(() => {
    if (!hydrated) return;
    load(needsAll ? [...pageItems, ...favorites] : pageItems);
  }, [hydrated, needsAll, pageItems, favorites, load]);

  const changeView = (next: FavoritesView) => {
    setView(next);
    setPage(1);
  };

  const goToPage = (target: number) => {
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Evita el parpadeo del estado vacío mientras se lee localStorage
  if (!hydrated) return null;

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16 opacity-80">
        <Star className="mx-auto mb-3" size={40} />
        <p className="mb-4">Todavía no has marcado ningún favorito.</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Ir a la página principal
        </Link>
      </div>
    );
  }

  const listBytes = favoritesBytes(favorites);
  const usedBytes = listBytes + cacheBytes;
  const usedPercent = (usedBytes / MAX_FAVORITES_BYTES) * 100;
  const barColor =
    usedPercent >= 95
      ? "bg-red-500"
      : usedPercent >= 80
      ? "bg-yellow-400"
      : "bg-cyan-400";

  return (
    <div>
      {/* Contador y búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm opacity-70">
          {filtered.length === favorites.length
            ? `${favorites.length} favoritos`
            : `${filtered.length} de ${favorites.length} favoritos`}
        </p>

        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar en favoritos…"
            aria-label="Buscar en favoritos"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-cyan-400"
            style={{
              backgroundColor: "var(--panel)",
              color: "var(--foreground)",
              borderColor: "var(--accent-border)",
            }}
          />
        </div>
      </div>

      {/* Filtro por estado y orden */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por estado de emisión"
        >
          {STATUS_CHIPS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={view.status === value}
              onClick={() => changeView({ ...view, status: value })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                view.status === value
                  ? "bg-cyan-400 text-black"
                  : "bg-[var(--panel)] hover:bg-[var(--panel-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Ordenar por</span>
          <select
            value={view.sort}
            onChange={(e) =>
              changeView({ ...view, sort: e.target.value as SortMode })
            }
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
            style={{
              backgroundColor: "var(--panel)",
              color: "var(--foreground)",
              borderColor: "var(--accent-border)",
            }}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {needsAll && pending > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 text-xs opacity-70 mb-4"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Cargando datos de emisión de tus favoritos… quedan {pending}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="text-center opacity-70 py-16">
          {pending > 0 && needsAll
            ? "Buscando datos de emisión…"
            : "Ningún favorito coincide con la búsqueda o el filtro. Los que no tienen ficha en My Anime List no aparecen al filtrar por estado."}
        </p>
      )}

      <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {pageItems.map((fav) => {
          const entry = info[fav.key]; // undefined = cargando
          const loadingInfo = entry === undefined;
          const mal = entry?.mal ?? null;

          const airing =
            mal?.status === "Currently Airing" ||
            mal?.status === "Not yet aired";
          // Imagen y título llevan a la página principal del anime en la
          // primera fuente donde se encontró (AnimeAV1 primero), igual que su
          // icono. Si aún no hay enlace directo, a la búsqueda en AnimeAV1.
          const cardUrl =
            FAVORITE_SOURCES.map((source) => entry?.links?.[source] ?? null).find(
              (url): url is string => !!url
            ) ?? getSourceSearchUrl(FAVORITE_SOURCES[0], fav.title);
          const cardTitle = mal?.title || fav.title;

          return (
            <div
              key={fav.key}
              className="bg-[var(--panel)] rounded-xl overflow-hidden shadow flex flex-col"
            >
              <div className="relative">
                <a href={cardUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={mal?.image || fav.image}
                    alt={cardTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-56 object-cover"
                  />
                </a>

                <FavoriteButton
                  title={fav.title}
                  image={fav.image}
                  source={fav.source}
                  sourceUrl={fav.sourceUrl}
                  className="absolute top-2 left-2"
                />

                {airing && mal?.day && mal.broadcastTime && (
                  <span
                    className="absolute top-2 right-2 text-xs font-bold rounded px-2 py-1 shadow-md"
                    style={{
                      backgroundColor: "var(--scroll-thumb)",
                      color: "var(--badge-fg)",
                    }}
                  >
                    {mal.day.slice(0, 3)} {mal.broadcastTime} {mal.period}
                  </span>
                )}
              </div>

              <div className="p-3 flex flex-col gap-2 flex-1">
                {mal ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-blue-600/40 px-2 py-1 rounded">
                      {mal.type ?? "TV Anime"} • {mal.episodes ?? "N/A"} ep
                    </span>
                    <StatusBadge
                      status={mal.status ?? ""}
                      airedFrom={mal.airedFrom}
                      firstBroadcast={mal.firstBroadcast}
                    />
                    <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded">
                      ⭐ {mal.score ?? "N/A"}
                    </span>
                  </div>
                ) : loadingInfo ? (
                  <div className="text-xs opacity-60 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Buscando en My Anime List…
                  </div>
                ) : (
                  <span className="text-xs opacity-60">
                    Sin ficha en My Anime List
                  </span>
                )}

                <a
                  href={cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={cardTitle}
                  className="font-semibold leading-tight hover:underline line-clamp-2 min-h-10"
                >
                  {cardTitle}
                </a>

                <div className="mt-auto pt-1 flex items-center gap-2">
                  {FAVORITE_SOURCES.map((source) => {
                    const direct = entry?.links?.[source] ?? null;
                    const name = SOURCE_LABEL[source];
                    const tooltip = direct
                      ? `Ver en ${name}`
                      : loadingInfo
                      ? `Buscando en ${name}…`
                      : `Buscar en ${name}`;

                    return (
                      <a
                        key={source}
                        href={direct ?? getSourceSearchUrl(source, fav.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={tooltip}
                        aria-label={tooltip}
                        className={`transition hover:scale-110 ${
                          direct ? "" : "opacity-50"
                        } ${loadingInfo ? "animate-pulse" : ""}`}
                      >
                        <img
                          src={SOURCE_ICONS[source]}
                          alt={name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      </a>
                    );
                  })}

                  {mal && (
                    <a
                      href={mal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en My Anime List"
                      aria-label="Ver en My Anime List"
                      className="h-7 px-2 rounded-full bg-blue-600/40 text-[11px] font-bold flex items-center transition hover:scale-110"
                    >
                      MAL
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <nav
          aria-label="Paginación"
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
            className="h-9 w-9 flex items-center justify-center rounded-md bg-[var(--panel)] hover:bg-[var(--panel-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={18} />
          </button>

          {pageNumbers(currentPage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 opacity-60">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                className={`min-w-9 h-9 px-2 rounded-md text-sm font-medium transition ${
                  p === currentPage
                    ? "bg-cyan-400 text-black"
                    : "bg-[var(--panel)] hover:bg-[var(--panel-hover)]"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
            className="h-9 w-9 flex items-center justify-center rounded-md bg-[var(--panel)] hover:bg-[var(--panel-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      )}

      {/* Espacio usado */}
      <div className="mt-10 pt-5 border-t border-white/10">
        <div className="flex justify-between text-xs opacity-70 mb-1.5">
          <span>Espacio usado por tus favoritos</span>
          <span className="tabular-nums">
            {formatBytes(usedBytes)} de {formatBytes(MAX_FAVORITES_BYTES)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${Math.max(usedPercent, 0.6)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] opacity-50">
          Lista: {formatBytes(listBytes)} · datos de emisión guardados:{" "}
          {formatBytes(cacheBytes)}
        </p>
      </div>
    </div>
  );
}