import { reduceAnimes } from '@/lib/sources';
import { NextResponse } from 'next/server';

export async function GET() {
  const animes = await reduceAnimes();
  return NextResponse.json(animes);
}