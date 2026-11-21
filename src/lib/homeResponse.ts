import type { SourceName } from "@/types/sourceVars";
import type { SourceStatus } from "@/lib/sources";

/**
 * Respuesta completa: se guarda 2 min y se sirve "vieja" hasta 10 min mientras se renueva.
 * Respuesta incompleta (un sitio falló o fue lento): solo 30 s, para volver a intentarlo
 * pronto sin que nadie espere (se sigue sirviendo la anterior mientras se renueva).
 */
export function homeCacheControl(complete: boolean): string {
  return complete
    ? "public, s-maxage=120, stale-while-revalidate=600"
    : "public, s-maxage=30, stale-while-revalidate=300";
}

/** Para ver en DevTools > Network > Timing cuánto tardó cada sitio. */
export function serverTimingHeader(
  sources: Record<SourceName, SourceStatus>,
  totalMs: number
): string {
  const parts = Object.entries(sources)
    .filter(([, status]) => status.enabled)
    .map(([name, status]) => `${name};dur=${Math.round(status.ms)}${status.ok ? "" : ';desc="falló o vacío"'}`);

  parts.push(`total;dur=${Math.round(totalMs)}`);
  return parts.join(", ");
}