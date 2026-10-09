import { useCallback, useEffect, useRef, useState } from "react";
import type { Favorite } from "@/lib/favorites";
import { runPool } from "@/lib/runPool";

export type MalCard = {
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

export type Info = {
  mal: MalCard | null;
  links: Record<string, string | null>;
};

/** undefined = cargando · null = no se pudo obtener · Info = listo */
export type InfoMap = Record<string, Info | null | undefined>;

type Cached = { at: number; data: Info };
type Cache = Record<string, Cached>;

const CACHE_KEY = "pushanime:favoritesInfo";

// El estado de emisión cambia con el tiempo; si no hubo ficha, reintentamos antes
const TTL_FOUND_MS = 6 * 60 * 60 * 1000; // 6 h
const TTL_MISSING_MS = 30 * 60 * 1000; // 30 min

export function isFresh(cached: Cached, now = Date.now()): boolean {
  return now - cached.at < (cached.data.mal ? TTL_FOUND_MS : TTL_MISSING_MS);
}

export function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Cache)
      : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // sin espacio o bloqueado: la página sigue funcionando, solo sin caché
  }
}

/** Espacio que ocupa la caché (2 bytes por carácter, clave incluida). */
export function cacheSizeBytes(): number {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (CACHE_KEY.length + raw.length) * 2 : 0;
  } catch {
    return 0;
  }
}

/** Borra de la caché lo de favoritos que ya no existen. */
export function pruneCache(validKeys: Set<string>): void {
  const cache = readCache();
  const kept: Cache = {};

  for (const [key, cached] of Object.entries(cache)) {
    if (validKeys.has(key)) kept[key] = cached;
  }

  if (Object.keys(kept).length === Object.keys(cache).length) return;

  if (Object.keys(kept).length === 0) {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // nada que hacer
    }
  } else {
    writeCache(kept);
  }
}

/**
 * De la lista dada, los favoritos cuya info hay que pedir: sin repetidos,
 * sin los que ya tienen datos recientes y sin los ya intentados en esta sesión.
 */
export function pendingFor(
  items: Favorite[],
  cache: Cache,
  attempted: Set<string>,
  now = Date.now()
): Favorite[] {
  const unique = new Map<string, Favorite>();
  for (const item of items) {
    if (!unique.has(item.key)) unique.set(item.key, item);
  }

  return [...unique.values()].filter((fav) => {
    if (attempted.has(fav.key)) return false;
    const cached = cache[fav.key];
    return !cached || !isFresh(cached, now);
  });
}

/**
 * Info (ficha de MAL y enlaces) de los favoritos. Se guarda en el navegador:
 * lo ya consultado aparece al instante y solo se vuelve a pedir si está viejo.
 */
export function useFavoritesInfo() {
  // Arranca con lo guardado (la página no pinta nada hasta hidratarse, no hay desajuste)
  const [info, setInfo] = useState<InfoMap>(() => {
    if (typeof window === "undefined") return {};

    const map: InfoMap = {};
    for (const [key, cached] of Object.entries(readCache())) {
      map[key] = cached.data;
    }
    return map;
  });
  const [pending, setPending] = useState(0);
  const [bytes, setBytes] = useState(0);

  const attempted = useRef(new Set<string>());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    setBytes(cacheSizeBytes());
    return () => {
      alive.current = false;
    };
  }, []);

  /** Pide la info de estos favoritos (3 a la vez), si hace falta. */
  const load = useCallback((items: Favorite[]) => {
    const todo = pendingFor(items, readCache(), attempted.current);
    if (todo.length === 0) return;

    todo.forEach((fav) => attempted.current.add(fav.key));
    setPending((n) => n + todo.length);

    runPool(todo, 3, async (fav) => {
      try {
        const res = await fetch(
          `/api/favorites/info?title=${encodeURIComponent(fav.title)}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data: Info = await res.json();

        const cache = readCache();
        cache[fav.key] = { at: Date.now(), data };
        writeCache(cache);

        if (alive.current) {
          setInfo((prev) => ({ ...prev, [fav.key]: data }));
          setBytes(cacheSizeBytes());
        }
      } catch {
        // Si ya había datos guardados (aunque viejos) se conservan
        if (alive.current) {
          setInfo((prev) =>
            prev[fav.key] === undefined ? { ...prev, [fav.key]: null } : prev
          );
        }
      } finally {
        if (alive.current) setPending((n) => n - 1);
      }
    });
  }, []);

  const prune = useCallback((validKeys: Set<string>) => {
    pruneCache(validKeys);
    setBytes(cacheSizeBytes());
  }, []);

  return { info, load, prune, pending, cacheBytes: bytes };
}