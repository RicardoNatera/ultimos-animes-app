'use client';

import { useState } from 'react';
import { AnimeResult } from '@/types/anime';
import { SOURCE_ICONS } from '@/types/sourceVars';
import AnimeDescriptionModal from './AnimeDescriptionModal';
import { Info } from 'lucide-react';

export default function AnimeCardWithHover({ anime }: { anime: AnimeResult }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative group bg-[var(--panel)] border border-[var(--border)] rounded-2xl shadow-md p-2 transition-all hover:scale-[1.03] hover:ring-2 hover:ring-[var(--accent)] w-48">
        <a href={anime.url} target="_blank" rel="noopener noreferrer">
          <div className="relative">
            <img
              src={anime.image}
              alt={anime.title}
              className="w-full h-64 object-cover rounded-xl transition duration-300 group-hover:brightness-110"
            />
            <img
              src={SOURCE_ICONS[anime.source]}
              alt={anime.source}
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full p-1 shadow-sm"
            />
          </div>
        </a>

        {/* Área del título con altura fija */}
        <div className="mt-2 h-10 flex items-center justify-center text-sm font-medium text-center text-[var(--foreground)]">
          <h3 className="line-clamp-2">{anime.title}</h3>
        </div>

        {/* Botón de descripción mejorado */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--foreground)] hover:underline mt-2 mx-auto cursor-pointer transition-colors"
        >
          <Info className="w-4 h-4" />
          Ver descripción
        </button>
      </div>

      {showModal && (
        <AnimeDescriptionModal
          onClose={() => setShowModal(false)}
          title={anime.title}
          description={anime.description || ''}
          source={anime.source}
          url={anime.url}
        />
      )}
    </>
  );
}
