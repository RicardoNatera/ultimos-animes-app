import { useCallback, useSyncExternalStore } from "react";
import type { SourceName } from "@/types/sourceVars";
import { normalizeKey, sameAnime } from "@/lib/titles";

export type Favorite = {
  key: string; // título normalizado
  title: string;
  image: string;
  source: SourceName; // fuente desde la que se marcó
  sourceUrl: string; // enlace de esa tarjeta
  addedAt: number;
};

type NewFavorite = Omit<Favorite, "key" | "addedAt">;

/**
 * Pequeño store sobre localStorage, compatible con useSyncExternalStore.
 * - En el servidor siempre devuelve `fallback` (no rompe la hidratación).
 * - Se sincroniza entre pestañas con el evento "storage".
 */
function createLocalStore<T>(
  storageKey: string,
  fallback: T,
  isValid: (value: unknown) => value is T
) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return fallback;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey) {
      cache = read();
      loaded = true;
      emit();
    }
  };

  return {
    getSnapshot: (): T => {
      if (!loaded) {
        cache = read();
        loaded = true;
      }
      return cache;
    },
    getServerSnapshot: (): T => fallback,
    subscribe: (listener: () => void) => {
      if (listeners.size === 0) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", onStorage);
      };
    },
    set: (next: T) => {
      cache = next;
      loaded = true;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // almacenamiento lleno o bloqueado: se mantiene solo en memoria
      }
      emit();
    },
  };
}

const NO_FAVORITES: Favorite[] = [];

const favoritesStore = createLocalStore<Favorite[]>(
  "pushanime:favorites",
  NO_FAVORITES,
  (v): v is Favorite[] => Array.isArray(v)
);

const onlyFavoritesStore = createLocalStore<boolean>(
  "pushanime:onlyFavorites",
  false,
  (v): v is boolean => typeof v === "boolean"
);

export function toggleFavorite(input: NewFavorite) {
  const current = favoritesStore.getSnapshot();
  const existing = current.find((f) => sameAnime(f.title, input.title));

  if (existing) {
    favoritesStore.set(current.filter((f) => f !== existing));
  } else {
    favoritesStore.set([
      { ...input, key: normalizeKey(input.title), addedAt: Date.now() },
      ...current,
    ]);
  }
}

export function useFavorites() {
  const favorites = useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot
  );

  const isFavorite = useCallback(
    (title: string) => favorites.some((f) => sameAnime(f.title, title)),
    [favorites]
  );

  return { favorites, isFavorite };
}

/** Filtro "solo favoritos" de la home (se recuerda entre visitas). */
export function useOnlyFavorites(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    onlyFavoritesStore.subscribe,
    onlyFavoritesStore.getSnapshot,
    onlyFavoritesStore.getServerSnapshot
  );
  return [value, onlyFavoritesStore.set];
}

/** false en el servidor y durante la hidratación; true ya en el navegador. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}