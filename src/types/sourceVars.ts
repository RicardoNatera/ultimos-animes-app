export const SOURCES = {
  animeav1: "animeav1",
  otakustv: "otakustv",
  animeflv: "animeflv",
} as const;

export type SourceName = keyof typeof SOURCES;

/**
 * INTERRUPTOR DE FUENTES
 * `false` = apagada: no se consulta en ningún sitio (ni home, ni búsqueda,
 * ni descargas, ni favoritos) y desaparece de los filtros.
 * `true`  = encendida: vuelve a tenerse en cuenta en todo.
 */
export const SOURCE_ENABLED: Record<SourceName, boolean> = {
  animeav1: true,
  otakustv: true,
  animeflv: false, // la página está caída
};

/** Fuentes encendidas, en el orden en que están declaradas. */
export const ENABLED_SOURCES = (Object.keys(SOURCE_ENABLED) as SourceName[]).filter(
  (source) => SOURCE_ENABLED[source]
);

/** ¿Es una fuente que existe y está encendida? */
export function isSourceEnabled(source: string): source is SourceName {
  return (
    Object.prototype.hasOwnProperty.call(SOURCE_ENABLED, source) &&
    SOURCE_ENABLED[source as SourceName]
  );
}

/**
 * De una lista "a,b,c" que pide el cliente, solo las fuentes que existen y
 * están encendidas. Sin lista, todas las encendidas.
 */
export function parseEnabledSources(param: string | null): SourceName[] {
  const requested = param
    ? param.split(",").map((s) => s.trim().toLowerCase())
    : ENABLED_SOURCES;

  return requested.filter(isSourceEnabled);
}

export const SOURCE_PRIORITY: Record<string, number> = {
  [SOURCES.animeav1]: 0,
  [SOURCES.animeflv]: 2,
  [SOURCES.otakustv]: 1,
};

export const SOURCE_ICONS: Record<SourceName, string> = {
  animeav1: "https://animeav1.com/favicon.ico",
  otakustv: "https://i.imgur.com/gcSlWN5.png",
  animeflv: "https://www3.animeflv.net/favicon.ico",
};

export const SOURCE_NAMES: Record<SourceName, string> = {
  animeav1: "AnimeAV1",
  otakustv: "OtakusTV",
  animeflv: "AnimeFLV",
};

export const SOURCE_LOGOS = {
  animeflv: "/icons/animeflv.png",
  animeav1: "/icons/animeav1.png",
  otakustv: "/icons/otakustv.png",
};

export const SOURCE_LINKS: Record<SourceName, string> = {
  animeav1: "https://animeav1.com",
  otakustv: "https://www.otakustv.net",
  animeflv: "https://www3.animeflv.net",
};

/** Fuentes que se muestran como enlaces en la página de favoritos. */
export const FAVORITE_SOURCES: SourceName[] = (["animeav1", "otakustv"] as SourceName[]).filter(
  (source) => SOURCE_ENABLED[source]
);

/** URL de la búsqueda de un título dentro de cada fuente. */
export function getSourceSearchUrl(source: SourceName, query: string): string {
  const q = encodeURIComponent(query);

  switch (source) {
    case "animeav1":
      return `${SOURCE_LINKS.animeav1}/catalogo?search=${q}`;
    case "otakustv":
      return `${SOURCE_LINKS.otakustv}/animes?buscar=${q}`;
    case "animeflv":
      return `${SOURCE_LINKS.animeflv}/browse?q=${q}`;
  }
}