import {
  MAX_FAVORITES_BYTES,
  favoritesBytes,
  type Favorite,
} from "@/lib/favorites";
import { normalizeKey, sameAnime } from "@/lib/titles";
import { SOURCES } from "@/types/sourceVars";

export const EXPORT_FORMAT = "pushanime-favorites";
export const EXPORT_VERSION = 1;

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // tamaño máximo del archivo
export const MAX_IMPORT_ENTRIES = 2000; // favoritos máximos por archivo

const MAX_TITLE_LENGTH = 300;
const MAX_URL_LENGTH = 2000;

export type FavoritesExport = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  favorites: Favorite[];
};

/** Contenido del archivo de copia de seguridad. */
export function buildExport(
  favorites: Favorite[],
  now = new Date()
): FavoritesExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    favorites,
  };
}

/** "pushanime-favoritos-2026-11-10.json" (con la fecha local). */
export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `pushanime-favoritos-${date}.json`;
}

/** Solo direcciones web normales (descarta "javascript:", "data:", etc.). */
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return false;

  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Convierte una entrada del archivo en un favorito válido, o null si no sirve.
 * Se construye un objeto nuevo con solo los campos esperados: lo que venga
 * de más en el archivo se descarta, y la clave se recalcula (no se fía del archivo).
 */
function sanitizeEntry(raw: unknown): Favorite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title || title.length > MAX_TITLE_LENGTH) return null;

  if (
    typeof r.source !== "string" ||
    !Object.prototype.hasOwnProperty.call(SOURCES, r.source)
  ) {
    return null;
  }

  if (!isHttpUrl(r.sourceUrl)) return null;

  const addedAt =
    typeof r.addedAt === "number" && Number.isFinite(r.addedAt) && r.addedAt > 0
      ? r.addedAt
      : 0; // sin fecha fiable: se trata como el más antiguo

  return {
    key: normalizeKey(title),
    title,
    image: isHttpUrl(r.image) ? r.image : "",
    source: r.source as Favorite["source"],
    sourceUrl: r.sourceUrl,
    addedAt,
  };
}

export type ParsedImport =
  | { ok: true; favorites: Favorite[]; invalid: number }
  | { ok: false; error: string };

/** Lee y valida el texto de un archivo de copia de seguridad. */
export function parseImport(text: string): ParsedImport {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "El archivo es demasiado grande." };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }

  const notBackup = {
    ok: false as const,
    error: "El archivo no parece una copia de favoritos de Push Anime.",
  };

  if (!data || typeof data !== "object" || Array.isArray(data)) return notBackup;
  const obj = data as Record<string, unknown>;

  if (obj.format !== EXPORT_FORMAT) return notBackup;
  if (obj.version !== EXPORT_VERSION) {
    return { ok: false, error: "La copia es de una versión que no se puede leer." };
  }
  if (!Array.isArray(obj.favorites)) return notBackup;

  if (obj.favorites.length > MAX_IMPORT_ENTRIES) {
    return {
      ok: false,
      error: `Hay demasiados favoritos en el archivo (máximo ${MAX_IMPORT_ENTRIES}).`,
    };
  }

  const favorites: Favorite[] = [];
  let invalid = 0;

  for (const raw of obj.favorites) {
    const favorite = sanitizeEntry(raw);
    if (favorite) favorites.push(favorite);
    else invalid++;
  }

  return { ok: true, favorites, invalid };
}

export type MergeResult = {
  merged: Favorite[];
  added: number;
  duplicates: number;
  skippedBySpace: number;
};

/**
 * Suma los favoritos importados a los actuales, sin tocar los que ya tienes:
 * - se saltan los que ya están (mismo anime, aunque el título varíe un poco),
 * - si no cabe todo en el espacio permitido, entran los más recientes hasta llenarlo.
 * Los favoritos quedan ordenados del más reciente al más antiguo.
 */
export function mergeFavorites(
  current: Favorite[],
  incoming: Favorite[],
  maxBytes = MAX_FAVORITES_BYTES
): MergeResult {
  const existingKeys = new Set(current.map((f) => f.key));
  const seen = new Set<string>();
  const fresh: Favorite[] = [];
  let duplicates = 0;

  const newestFirst = [...incoming].sort((a, b) => b.addedAt - a.addedAt);

  for (const entry of newestFirst) {
    const isDuplicate =
      existingKeys.has(entry.key) ||
      seen.has(entry.key) ||
      current.some((f) => sameAnime(f.title, entry.title));

    if (isDuplicate) {
      duplicates++;
      continue;
    }

    seen.add(entry.key);
    fresh.push(entry);
  }

  // Cada favorito suma su JSON (+ una coma si no es el primero), a 2 bytes por carácter
  const merged = [...current];
  let bytes = favoritesBytes(merged);
  let added = 0;
  let skippedBySpace = 0;

  for (const [i, entry] of fresh.entries()) {
    const extra = (JSON.stringify(entry).length + (merged.length > 0 ? 1 : 0)) * 2;

    // Corte limpio: entran los más recientes hasta llenar el espacio y el resto queda fuera
    if (bytes + extra > maxBytes) {
      skippedBySpace = fresh.length - i;
      break;
    }

    merged.push(entry);
    bytes += extra;
    added++;
  }

  merged.sort((a, b) => b.addedAt - a.addedAt);

  return { merged, added, duplicates, skippedBySpace };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto para decirle al usuario qué pasó con la importación. */
export function summarizeImport(
  result: Pick<MergeResult, "added" | "duplicates" | "skippedBySpace">,
  invalid: number
): string {
  const extras: string[] = [];
  if (result.duplicates > 0) {
    extras.push(`${plural(result.duplicates, "ya estaba", "ya estaban")}`);
  }
  if (invalid > 0) {
    extras.push(`${plural(invalid, "no era válido", "no eran válidos")}`);
  }
  if (result.skippedBySpace > 0) {
    extras.push(
      `${plural(result.skippedBySpace, "no cupo", "no cupieron")} por el límite de espacio`
    );
  }

  const main =
    result.added > 0
      ? `Se importaron ${plural(result.added, "favorito", "favoritos")}`
      : "No había nada nuevo que importar";

  return extras.length > 0 ? `${main} (${extras.join(", ")}).` : `${main}.`;
}