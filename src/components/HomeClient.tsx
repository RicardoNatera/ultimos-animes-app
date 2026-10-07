'use client';

import { useEffect, useState } from 'react';
import AnimeCard from '@/components/AnimeCard';
import { ScrapedAnime } from '@/types/anime';
import { RefreshCw, Star } from 'lucide-react';
import Loader from '@/components/Loader';
import { useFavorites, useOnlyFavorites } from '@/lib/favorites';

export default function HomeClient() {
  const [animes, setAnimes] = useState<ScrapedAnime[]>([]);
  const [loading, setLoading] = useState(false);
  const { favorites, isFavorite } = useFavorites();
  const [onlyFavorites, setOnlyFavorites] = useOnlyFavorites();

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

  const visible = onlyFavorites
    ? animes.filter((anime) => isFavorite(anime.title))
    : animes;

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              aria-pressed={onlyFavorites}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 border rounded-md shadow transition ${
                onlyFavorites ? 'bg-yellow-400 text-black border-yellow-500' : 'hover:bg-gray-100'
              }`}
              style={
                onlyFavorites
                  ? undefined
                  : {
                      backgroundColor: 'var(--panel)',
                      color: 'var(--foreground)',
                      borderColor: 'var(--accent-border)',
                    }
              }
          >
              <Star className={`w-4 h-4 ${onlyFavorites ? 'fill-black' : ''}`} />
              Solo favoritos
          </button>

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
        ) : onlyFavorites && visible.length === 0 ? (
          <p className="text-center opacity-70 py-16">
            {favorites.length === 0
              ? 'Aún no tienes favoritos. Marca la ⭐ en una tarjeta para seguir ese anime.'
              : 'Ninguno de tus favoritos tiene episodios nuevos ahora mismo.'}
          </p>
        ) : (

          <section className="grid gap-4 justify-items-center grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {visible.map((anime) => (
                <AnimeCard
                key={`${anime.source}-${anime.url}`}
                title={anime.title}
                imageUrl={anime.image}
                episode={anime.episode}
                source={anime.source}
                sourceUrl={anime.url}
                finished={anime.finished}
                setFinishedURL={anime.setFinishedURL}
                />
            ))}
          </section>
        )}
    </div>
    );
}