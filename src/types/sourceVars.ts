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
  otakustv: "https://i.imgur.com/gcSlWN5.png",
  animeflv: "https://www3.animeflv.net/favicon.ico",
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