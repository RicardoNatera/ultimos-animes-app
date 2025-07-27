import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pushanime.vercel.app"), // cambia por tu dominio real si tienes uno
  title: {
    default: "Push Anime",
    template: "%s | Push Anime",
  },
  description: "Encuentra los últimos episodios de anime publicados en AnimeFLV, OtakusTV y AnimeAV1. Todo en un solo lugar.",
  keywords: ["anime", "animeflv", "otakustv", "animeav1", "episodios", "buscador de anime"],
  openGraph: {
    title: "Push Anime",
    description: "Explora y encuentra nuevos episodios de anime fácilmente desde múltiples fuentes.",
    url: "https://pushanime.vercel.app",
    siteName: "Push Anime",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Push Anime",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Push Anime",
    description: "Explora y encuentra nuevos episodios de anime fácilmente desde múltiples fuentes.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Pre-hydration theme fix */}
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`
          flex min-h-screen flex-col 
          ${geistSans.variable} ${geistMono.variable} 
          antialiased 
          bg-[--background] text-[--foreground]
        `}
      >
        <Suspense>
        <Header />
        <main className="flex flex-1 flex-col px-6">
          {children}
        </main>
        <Footer />
        </Suspense>
      </body>
    </html>
  );
}
