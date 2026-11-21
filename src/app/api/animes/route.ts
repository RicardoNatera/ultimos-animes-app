import { reduceAnimesWithStatus } from '@/lib/sources';
import { homeCacheControl, serverTimingHeader } from '@/lib/homeResponse';
import { NextResponse } from 'next/server';

export async function GET() {
  const start = performance.now();
  const { animes, sources, complete } = await reduceAnimesWithStatus();

  return NextResponse.json(animes, {
    headers: {
      "Cache-Control": homeCacheControl(complete),
      "Server-Timing": serverTimingHeader(sources, performance.now() - start),
    },
  });
}