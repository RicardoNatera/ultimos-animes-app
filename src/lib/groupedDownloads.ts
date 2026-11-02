import type { SourceName } from "@/types/sourceVars";

export type DownloadTarget = {
  source: SourceName;
  url: string;
  finishedUrl: string;
  episode?: number; // para avisar si cada sitio numera distinto
};

export type DownloadLink = { label: string; url: string; source: SourceName, episode?: number; };

type DownloadsResponse = {
  success?: boolean;
  links?: { label: string; url: string }[];
  finished?: boolean;
};

export type GroupedDownloads =
  | { ok: true; links: DownloadLink[]; finished: boolean | null }
  | { ok: false; reason: "connection" | "empty" };

/**
 * Pide los enlaces de descarga a todas las fuentes de un mismo capítulo
 * (la de la tarjeta y sus alternativas) y los junta, marcando de qué fuente
 * viene cada uno. Si una fuente falla, se usan las demás.
 */
export async function fetchGroupedDownloads(
  targets: DownloadTarget[],
  fetchJson: (target: DownloadTarget) => Promise<DownloadsResponse>
): Promise<GroupedDownloads> {
  const results = await Promise.allSettled(targets.map(fetchJson));

  const links: DownloadLink[] = [];
  let finished: boolean | null = null;

  for (const [i, result] of results.entries()) {
    if (result.status !== "fulfilled") continue;

    const json = result.value;
    if (!json.success || !json.links || json.links.length === 0) continue;

    for (const link of json.links) {
      links.push({ ...link, source: targets[i].source, episode: targets[i].episode });
    }

    // El estado "finalizado" lo toma de la primera fuente que respondió bien
    if (finished === null && typeof json.finished === "boolean") {
      finished = json.finished;
    }
  }

  if (links.length > 0) return { ok: true, links, finished };

  return {
    ok: false,
    reason: results.every((r) => r.status === "rejected") ? "connection" : "empty",
  };
}