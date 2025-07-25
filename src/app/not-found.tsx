'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center px-4">
      <Image
        src="/sadCat.png"
        alt="Gato triste"
        width={256}
        height={256}
        className="opacity-100"
      />
      <h1 className="text-5xl font-bold text-[var(--foreground)]">404</h1>
      <p className="text-lg text-[var(--muted)]">
        Ups... parece que te perdiste.
      </p>
      <Link
        href="/"
        className="px-6 py-2 border border-[var(--accent-border)] rounded-full hover:bg-[var(--accent-muted)] transition"
      >
        Volver al inicio
      </Link>
    </div>
  );
}