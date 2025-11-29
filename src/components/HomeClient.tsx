'use client';

import { useEffect, useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import { ScrapedAnime } from '@/types/anime';
import { RefreshCw } from 'lucide-react';
import Loader from '@/components/Loader';

export default function HomeClient() {
  const [animes, setAnimes] = useState<ScrapedAnime[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnimes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/animes');
      const data = await res.json();
      setAnimes(data);
    } catch (err) {
      console.error('Error al cargar animes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimes();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex justify-end items-center mb-4">
          <button
              onClick={fetchAnimes}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 border rounded-md shadow hover:bg-gray-100 transition"
              style={{
              backgroundColor: 'var(--panel)',
              color: 'var(--foreground)',
              borderColor: 'var(--accent-border)',
              }}
          >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
        {loading && animes.length === 0 ? (
          <Loader />
        ) : (

          <section className="grid gap-4 justify-items-center grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {animes.map((anime, idx) => (
                <AnimeCard
                key={idx}
                title={anime.title}
                imageUrl={anime.image}
                episode={anime.episode}
                source={anime.source}
                sourceUrl={anime.url}
                finished={anime.finished}
                />
            ))}
          </section>
        )}
    </div>
    );
}
