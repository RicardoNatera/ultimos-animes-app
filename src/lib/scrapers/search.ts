import axios from 'axios';
import { load } from 'cheerio';
import { AnimeResult } from '@/types/anime';
import { SOURCES, SOURCE_LINKS } from '@/types/sourceVars';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Connection': 'keep-alive',
};

export async function searchFromAnimeFLV(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.animeflv}/browse?q=${encodeURIComponent(query)}`;
  const results: AnimeResult[] = [];

  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: { ...HEADERS, Referer: SOURCE_LINKS.animeflv },
      timeout: 10000,
    });

    const $ = load(html);
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

    console.log(`[AnimeFLV] "${query}" → ${results.length} resultados`);
  } catch (err) {
    console.error(`[AnimeFLV] Error al buscar "${query}":`, err);
  }

  return results;
}

export async function searchFromOtakusTV(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.otakustv}/animes?buscar=${encodeURIComponent(query)}`;
  const results: AnimeResult[] = [];

  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: { ...HEADERS, Referer: SOURCE_LINKS.otakustv },
      timeout: 10000,
    });

    if (html.includes('Verificando tu navegador') || html.includes('Checking your browser') || html.includes('Espere mientras se verifica su solicitud…') ) {
      console.warn(`[OtakusTV] Protección anti-bots activa. No se puede obtener resultados para: "${query}"`);
      return [];
    }

    const $ = load(html);
    $('article.li').each((_, el) => {
      const anchor = $(el).find('figure.i a');
      const href = anchor.attr('href')?.slice(1) || '';
      const title = $(el).find('h3.h a').text().trim();
      const img = $(el).find('figure.i a img').attr('data-src') || '';
      const description = "Sin Descripción";

      if (href && title && img) {
        results.push({
          title,
          image: img.startsWith('http') ? img : `${SOURCE_LINKS.otakustv}${img}`,
          url: href.startsWith('http') ? href : `${SOURCE_LINKS.otakustv}${href}`,
          source: SOURCES.otakustv,
          description,
        });
      }
    });

    console.log(`[OtakusTV] "${query}" → ${results.length} resultados`);
  } catch (err) {
    console.error(`[OtakusTV] Error al buscar "${query}":`, err);
  }

  return results;
}

export async function searchFromAnimeAV1(query: string): Promise<AnimeResult[]> {
  const searchUrl = `${SOURCE_LINKS.animeav1}/catalogo?search=${encodeURIComponent(query)}`;
  const results: AnimeResult[] = [];

  try {
    const { data: html } = await axios.get(searchUrl, {
      headers: { ...HEADERS, Referer: SOURCE_LINKS.animeav1 },
      timeout: 10000,
    });

    const $ = load(html);
    $('article[class*="group/item"]').each((_, el) => {
      const urlPath = $(el).find('a[href^="/media/"]').attr('href') || '';
      const url = `${SOURCE_LINKS.animeav1}${urlPath}`;
      const image = $(el).find('img.aspect-poster').attr('src') || '';
      const title = $(el).find('h3').first().text().trim();
      const description = $(el).find('div.my-1 p').text().trim();

      if (title && url && image) {
        results.push({
          title,
          url,
          image: image.startsWith('http') ? image : `${SOURCE_LINKS.animeav1}${image}`,
          source: SOURCES.animeav1,
          description,
        });
      }
    });

    console.log(`[AnimeAV1] "${query}" → ${results.length} resultados`);
  } catch (err) {
    console.error(`[AnimeAV1] Error al buscar "${query}":`, err);
  }

  return results;
}
