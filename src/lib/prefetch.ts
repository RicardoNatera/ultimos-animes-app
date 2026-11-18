import { getFavorites } from "@/lib/favorites";
import { prefetchFavoritesInfo } from "@/lib/favoritesInfo";
import { prefetchSchedule } from "@/lib/scheduleStore";

export type PrefetchEnv = {
  visible: boolean;
  saveData: boolean;
  effectiveType?: string;
};

const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

/** Espera tras cargar la home para no competir con sus propias peticiones. */
export const START_DELAY_MS = 2500;

/** Solo se precarga con la pestaña visible, sin ahorro de datos y con buena conexión. */
export function canPrefetch(env: PrefetchEnv): boolean {
  if (!env.visible || env.saveData) return false;
  return !(env.effectiveType && SLOW_CONNECTIONS.has(env.effectiveType));
}

export function readEnv(): PrefetchEnv {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  return {
    visible: document.visibilityState === "visible",
    saveData: !!connection?.saveData,
    effectiveType: connection?.effectiveType,
  };
}

/** Ejecuta `fn` cuando el navegador esté ocioso (Safari no tiene esa función: usa un retraso). */
export function whenIdle(fn: () => void, timeoutMs = 4000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(fn, 1500);
  return () => window.clearTimeout(id);
}

/**
 * Precarga el calendario (hoy y mañana) y los primeros favoritos.
 * Devuelve una función para cancelar el INICIO; una vez empezada, la carga
 * continúa aunque el usuario cambie de página (de eso se trata).
 */
export function startBackgroundPrefetch(): () => void {
  let cancelIdle: (() => void) | undefined;

  const timer = window.setTimeout(() => {
    cancelIdle = whenIdle(() => {
      if (!canPrefetch(readEnv())) return;

      void prefetchSchedule();
      void prefetchFavoritesInfo(getFavorites());
    });
  }, START_DELAY_MS);

  return () => {
    window.clearTimeout(timer);
    cancelIdle?.();
  };
}