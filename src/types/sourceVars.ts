export const SOURCES = {
  animeav1: "animeav1",
  otakustv: "otakustv",
  animeflv: "animeflv",
} as const;

export type SourceName = keyof typeof SOURCES;

export const SOURCE_PRIORITY: Record<string, number> = {
  [SOURCES.animeav1]: 0,
  [SOURCES.otakustv]: 1,
  [SOURCES.animeflv]: 2,
};

export const SOURCE_ICONS: Record<SourceName, string> = {
  animeav1: "https://animeav1.com/favicon.ico",
  otakustv: "https://www1.otakustv.com/favicon.ico",
  animeflv: "https://www3.animeflv.net/favicon.ico",
};