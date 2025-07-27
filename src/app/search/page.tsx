'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimeResult } from '@/types/anime';
import AnimeCardWithHover from '@/components/AnimeCardWithHover';
import Loader from '@/components/Loader';
import { SOURCES } from '@/types/sourceVars';


export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim();

  const [animes, setAnimes] = useState<AnimeResult[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<AnimeResult[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(query)}&sources=animeflv,otakustv,animeav1`)
      .then(res => res.json())
      .then((data: AnimeResult[]) => {
        setAnimes(data);
        setFilteredAnimes(data);
        setSelectedSources(['todos']);
        setCurrentPage(1);
      })
      .catch(err => {
        console.error('Error en búsqueda:', err);
        setError('Hubo un problema al cargar los resultados.');
      })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    if (selectedSources.includes('todos')) {
      setFilteredAnimes(animes);
    } else {
      const filtered = animes.filter(anime =>
        selectedSources.includes(anime.source)
      );
      setFilteredAnimes(filtered);
    }
    setCurrentPage(1);
  }, [selectedSources, animes]);

  function toggleSource(src: string) {
    if (src === 'todos') {
      setSelectedSources(['todos']);
    } else {
      const updated = selectedSources.includes(src)
        ? selectedSources.filter(s => s !== src)
        : [...selectedSources.filter(s => s !== 'todos'), src];

      if (updated.length === Object.keys(SOURCES).length) {
        setSelectedSources(['todos']);
      } else {
        setSelectedSources(updated);
      }
    }
  }

  const totalPages = Math.ceil(filteredAnimes.length / itemsPerPage);
  const paginatedAnimes = filteredAnimes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Suspense>
      <div className="max-w-6xl mx-auto px-4 pt-12">
        {query ? (
          <div className="flex flex-col items-center text-[var(--foreground)] mb-4">
            <h1 className="text-2xl font-semibold text-center break-words mb-2">
              Resultados para: <span className="text-blue-500">"{query}"</span>
            </h1>
          </div>
        ) : (
          <p className="text-center text-[var(--muted-foreground)] text-sm">
            No se ingresó ningún término de búsqueda.
          </p>
        )}

        {!loading && animes.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mb-10 text-[var(--foreground)]">
            {['todos', ...Object.values(SOURCES)].map(src => (
              <label
                key={src}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(src)}
                  onChange={() => toggleSource(src)}
                  className="accent-blue-500 cursor-pointer w-4 h-4"
                />
                <span className="capitalize text-sm">{src}</span>
              </label>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : filteredAnimes.length === 0 ? (
          <p className="text-center text-[var(--muted-foreground)]">
            No se encontraron resultados.
          </p>
        ) : (
          <>
            <div className="w-full flex justify-center">
              <div className="relative z-0 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-6 gap-x-6">
                {paginatedAnimes.map(anime => (
                  <AnimeCardWithHover key={anime.url} anime={anime} />
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-8 gap-2 flex-wrap">
              {totalPages > 1 && (
                <div className="flex justify-center mt-10 gap-2 flex-wrap">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[36px] h-9 px-3 text-sm rounded-full border transition-all duration-200
                        ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-md border-blue-600'
                            : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--border)] hover:bg-blue-100 dark:hover:bg-blue-900'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {!loading && filteredAnimes.length > 0 ? (
          <div className="flex flex-col items-center text-[var(--foreground)] mt-4">
            <p className="text-sm text-center text-[var(--muted-foreground)] max-w-md px-4">
              Mostrando solo la primera página de resultados por fuente. Para ver más, visite la web original.
            </p>
            <p className="text-sm text-center text-[var(--muted-foreground)] max-w-md px-4">
              Es posible que algunos resultados no aparezcan dependiendo de su ubicación debido a restricciones o chequeos por parte de las fuentes principales, les invitamos a siempre visitar cada página para buscar lo que desea.
            </p>
          </div>
        ) : (
          <></>
        )}
        
      </div>
    </Suspense>
  );
}