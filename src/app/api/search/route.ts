import { NextRequest } from 'next/server';
import { searchFromAnimeFLV, searchFromOtakusTV, searchFromAnimeAV1 } from '@/lib/scrapers/search';
import { SOURCES } from '@/types/sourceVars';
import { AnimeResult } from '@/types/anime';
import stringSimilarity from 'string-similarity';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const sourcesParam = searchParams.get('sources') || '';
  const selectedSources = sourcesParam
    ? sourcesParam.split(',').map(s => s.trim().toLowerCase())
    : Object.values(SOURCES);

  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid query param "q"' }), {
      status: 400,
    });
  }

  try {
    const promises: Promise<AnimeResult[]>[] = [];

    if (selectedSources.includes(SOURCES.animeflv)) {
      promises.push(searchFromAnimeFLV(query));
    }
    if (selectedSources.includes(SOURCES.otakustv)) {
      promises.push(searchFromOtakusTV(query));
    }
    if (selectedSources.includes(SOURCES.animeav1)) {
      promises.push(searchFromAnimeAV1(query));
    }

    const results = await Promise.all(promises);
    const allAnimes: AnimeResult[] = results.flat();

    const sorted = allAnimes.sort((a, b) => {
      const simA = stringSimilarity.compareTwoStrings(a.title.toLowerCase(), query.toLowerCase());
      const simB = stringSimilarity.compareTwoStrings(b.title.toLowerCase(), query.toLowerCase());
      return simB - simA; 
    });

    return new Response(JSON.stringify(sorted), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch search results.' }), {
      status: 500,
    });
  }
}
