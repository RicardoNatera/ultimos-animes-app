import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-5 w-full border-t border-[var(--accent-border)] bg-[var(--panel)] text-[var(--muted)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 px-4 py-8 sm:items-center lg:flex-row lg:justify-between">

        {/* Logo + eslogan */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <figure>
            <Link href="/">
              <img
                src="/icons/theme-blue.png"
                alt="Logo"
                width={40}
                height={40}
                className="dark:hidden"
              />
              <img
                src="/icons/theme-orange.png"
                alt="Logo Dark"
                width={40}
                height={40}
                className="hidden dark:block"
              />
            </Link>
          </figure>
          <span className="text-sm font-medium italic text-[var(--foreground)] text-center sm:text-left">
            Casi todo en un solo lugar
          </span>
        </div>

        {/* Enlaces */}
        <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center">
          <Link href="/about" className="px-4 py-1 border border-[var(--accent-border)] rounded-full hover:bg-[var(--accent-muted)] transition">
            Sobre esta página
          </Link>
          <Link href="/credits" className="px-4 py-1 border border-[var(--accent-border)] rounded-full hover:bg-[var(--accent-muted)] transition">
            Agradecimientos
          </Link>
          <Link href="/terms" className="px-4 py-1 border border-[var(--accent-border)] rounded-full hover:bg-[var(--accent-muted)] transition">
            Términos y condiciones
          </Link>
          <Link href="/privacy" className="px-4 py-1 border border-[var(--accent-border)] rounded-full hover:bg-[var(--accent-muted)] transition">
            Política de privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
