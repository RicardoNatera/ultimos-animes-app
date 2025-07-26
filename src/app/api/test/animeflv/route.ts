import { NextResponse } from 'next/server';
import { searchFromAnimeFLV } from '@/lib/scrapers/search';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  const results = await searchFromAnimeFLV(query);
  return NextResponse.json(results);
}
