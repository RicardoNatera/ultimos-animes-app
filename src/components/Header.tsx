'use client';

import Link from 'next/link';
import { Search, Calendar } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  };

  return (
    <header className="w-full sticky top-0 z-40 border-b border-[var(--accent-border)] bg-[var(--panel)] shadow-sm backdrop-blur mb-5">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">

        {/* Logo + Nombre */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/icons/logo.png"
            alt="Logo"
            className="w-8 h-8 object-contain dark:hidden"
          />
          <img
            src="/icons/logoWhite.png"
            alt="Logo"
            className="w-8 h-8 object-contain hidden dark:block"
          />
          <span className="text-lg font-semibold text-[var(--foreground)] hidden sm:inline">
            Push Anime
          </span>
        </Link>

        {/* Barra de búsqueda — crece sin afectar la derecha */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 flex-grow max-w-[280px] sm:max-w-sm md:max-w-md mx-auto"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar anime..."
            className="w-full px-3 py-1.5 text-sm rounded-md bg-[var(--input)] text-[var(--foreground)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className={`p-2 rounded-md transition-colors ${
              query.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Search size={18} />
          </button>
        </form>

        {/* DERECHA FIJA: calendario + toggle SIEMPRE PEGADOS */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/schedule"
            className="p-2 rounded-md hover:bg-[var(--hover)] transition-colors"
            aria-label="Horario de emisión"
          >
            <Calendar size={20} className="text-[var(--foreground)]" />
          </Link>

          <ThemeToggle />
        </div>

      </div>
    </header>
  );
}
