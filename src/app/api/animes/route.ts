import { reduceAnimes } from '@/lib/sources';
import { NextResponse } from 'next/server';

export async function GET() {
  const animes = await reduceAnimes();
  return NextResponse.json(animes, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}