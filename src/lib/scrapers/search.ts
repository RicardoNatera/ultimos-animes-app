import { load } from 'cheerio';
import { AnimeResult } from '@/types/anime';
import { SOURCES, SOURCE_LINKS } from '@/types/sourceVars'

export async function searchFromAnimeFLV(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.animeflv}/browse?q=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl);
  const html = await res.text();
  const $ = load(html);

  const results: AnimeResult[] = [];

  $('article.Anime').each((_, el) => {
    const anchor = $(el).find('a');
    const title = anchor.find('h3.Title').text().trim();
    const description = $(el).find('div.Description > p').last().text().trim();
    const img = anchor.find('img').attr('src') || '';
    const href = anchor.attr('href') || '';

    if (title && img && href) {
      results.push({
        title,
        image: img.startsWith('http') ? img : `${SOURCE_LINKS.animeflv}${img}`,
        url: `${SOURCE_LINKS.animeflv}${href}`,
        source: SOURCES.animeflv,
        description,
      });
    }
  });

  return results;
}


export async function searchFromOtakusTV(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.otakustv}/buscador?q=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl);
  const html = await res.text();
  const $ = load(html);

  const results: AnimeResult[] = [];

  $('div.mb-10').each((_, el) => {
    const anchor = $(el).find('a');
    const href = anchor.attr('href') || '';
    const title = anchor.find('p').first().text().trim();
    const img = anchor.find('img').attr('src') || '';
    const description = anchor.attr('data-original-title')?.trim() || '';

    if (href && title && img) {
      results.push({
        title,
        image: img,
        url: href.startsWith('http') ? href : `${SOURCE_LINKS.otakustv}${href}`,
        source: SOURCES.otakustv,
        description,
      });
    }
  });

  return results;
}

export async function searchFromAnimeAV1(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.animeav1}/catalogo?search=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl);
  const html = await res.text();
  const $ = load(html);

  const results: AnimeResult[] = [];

  $('article.group\\/item').each((_, el) => {
    const urlPath = $(el).find('a[href^="/media/"]').attr('href') || '';
    const url = `${SOURCE_LINKS.animeav1}${urlPath}`;
    const image = $(el).find('img.aspect-poster').attr('src') || '';
    const title = $(el).find('h3').first().text().trim();
    const description = $(el).find('div.my-1 p').text().trim();

    if (title && url && image) {
      results.push({
        title,
        url,
        image,
        source: SOURCES.animeav1,
        description,
      });
    }
  });

  return results;
}