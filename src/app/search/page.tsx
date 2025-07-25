'use client';

import { useSearchParams } from 'next/navigation';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim();

  return (
    <div className="max-w-xl mx-auto mt-12 text-center px-4">
      {query ? (
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Buscando: <span className="text-blue-500">&quot;{query}&quot;</span>
        </h1>
      ) : (
        <p className="text-[var(--muted-foreground)] text-sm">
          No se ingresó ningún término de búsqueda.
        </p>
      )}
    </div>
  );
}
