"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import StatusBadge from "@/components/StatusBadge";
import { useFavorites, useHydrated } from "@/lib/favorites";
import { runPool } from "@/lib/runPool";
import {
  FAVORITE_SOURCES,
  SOURCE_ICONS,
  getSourceSearchUrl,
  type SourceName,
} from "@/types/sourceVars";

type MalCard = {
  malId: number;
  title: string;
  url: string;
  image: string;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  day: string | null;
  broadcastTime: string | null;
  period: string | null;
  airedFrom: string | null;
  firstBroadcast: string | null;
};

type Info = {
  mal: MalCard | null;
  links: Record<string, string | null>;
};

const SOURCE_LABEL: Record<SourceName, string> = {
  animeav1: "AnimeAV1",
  otakustv: "OtakusTV",
  animeflv: "AnimeFLV",
};

export default function FavoritesClient() {
  const hydrated = useHydrated();
  const { favorites } = useFavorites();

  // undefined = cargando · null = falló · Info = listo
  const [info, setInfo] = useState<Record<string, Info | null>>({});
  const requested = useRef(new Set<string>());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Pide la info de los favoritos que aún no se han consultado (3 a la vez)
  useEffect(() => {
    const pending = favorites.filter((f) => !requested.current.has(f.key));
    if (pending.length === 0) return;

    pending.forEach((f) => requested.current.add(f.key));

    runPool(pending, 3, async (fav) => {
      try {
        const res = await fetch(
          `/api/favorites/info?title=${encodeURIComponent(fav.title)}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data: Info = await res.json();
        if (alive.current) setInfo((prev) => ({ ...prev, [fav.key]: data }));
      } catch {
        if (alive.current) setInfo((prev) => ({ ...prev, [fav.key]: null }));
      }
    });
  }, [favorites]);

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

  return (
    <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {favorites.map((fav) => {
        const entry = info[fav.key]; // undefined = cargando
        const loadingInfo = entry === undefined;
        const mal = entry?.mal ?? null;

        const airing =
          mal?.status === "Currently Airing" || mal?.status === "Not yet aired";
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
  );
}