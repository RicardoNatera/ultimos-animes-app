'use client'

import { useEffect, useRef, useState } from "react";
import { SOURCE_ICONS, SOURCE_NAMES, SourceName } from "@/types/sourceVars";
import type { AnimeAlternative } from "@/types/anime";
import { fetchGroupedDownloads, type DownloadLink, type DownloadTarget } from "@/lib/groupedDownloads";
import DownloadModal from "@/components/DownloadModal";
import { Download, Loader2, AlertCircle } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";

type Props = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  episode: number;
  source: SourceName;
  finished: boolean;
  setFinishedURL:string;
  alternatives?: AnimeAlternative[];
  agoLabel?: string;
};

function AnimeCard({ title, imageUrl, source, sourceUrl, episode, finished, setFinishedURL, alternatives, agoLabel }: Props) {
  const badgeColor = source === "animeflv"
    ? "#facc15" // amarillo
    : source === "animeav1"
      ? "#16a34a" // verde
      : "#9333ea"; // morado

  const [downloads, setDownloads] = useState<DownloadLink[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinished, setIsFinished] = useState(finished)
  const cardRef = useRef<HTMLDivElement>(null);
  const isPremiere = episode === 0 || episode === 1;

  // Clave estable de las otras fuentes (evita volver a pedir enlaces si la lista se refresca)
  const altKey = JSON.stringify(alternatives ?? []);
  
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let cancelled = false;

    const fetchDownloads = async () => {
      // La fuente de la tarjeta y, si es el mismo capítulo en otras fuentes, también esas
      const targets: DownloadTarget[] = [
        { source, url: sourceUrl, finishedUrl: setFinishedURL, episode },
        ...(JSON.parse(altKey) as AnimeAlternative[]).map((alt) => ({
          source: alt.source,
          url: alt.url,
          finishedUrl: alt.setFinishedURL,
          episode: alt.episode,
        })),
      ];

      const result = await fetchGroupedDownloads(targets, async (target) => {
        const res = await fetch(
          `/api/downloads?source=${target.source}&url=${encodeURIComponent(target.url)}&urlFinished=${encodeURIComponent(target.finishedUrl)}`
        );
        return res.json();
      });
      if (cancelled) return;

      if (result.ok) {
        setDownloads(result.links);
        if (result.finished !== null) setIsFinished(result.finished);
        setError("");
      } else {
        setDownloads(null);
        setError(
          result.reason === "connection"
            ? "Error al conectar con la fuente."
            : "No se encontraron enlaces de descarga."
        );
      }
      setLoading(false);
    };

    // Solo pedimos los enlaces cuando la tarjeta está cerca de verse
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          fetchDownloads();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [source, sourceUrl, setFinishedURL, altKey, episode]);

  return (
    <div
      ref={cardRef}
      className="rounded-xl shadow-md overflow-visible p-3 w-full flex flex-col relative"
      style={{
      backgroundColor: "var(--panel)",
      color: "var(--foreground)",
      border: isPremiere ? "3px solid gold" : isFinished ? "3px solid red" : "none",
      boxShadow: isPremiere ? "0 0 10px rgba(255, 215, 0, 0.6)" : isFinished ? "0 0 10px rgba(250, 50, 46, 0.6)" : undefined
    }}
    >
      <div className="relative w-full aspect-3/2">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover rounded-t-xl hover:brightness-95 transition cursor-pointer"
          />
          <FavoriteButton
            title={title}
            image={imageUrl}
            source={source}
            sourceUrl={sourceUrl}
            className="absolute bottom-2 right-2"
          />
        </a>
        <span
          className="absolute top-2 left-2 text-xs font-bold rounded px-2 py-1 shadow-md"
          style={{
            backgroundColor: "var(--badge-bg)",
            color: "var(--badge-fg)",
          }}
        >
          Episodio {episode}
        </span>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Mismo capítulo disponible en otras fuentes */}
          {alternatives?.map((alt) => (
            <img
              key={alt.source}
              src={SOURCE_ICONS[alt.source]}
              alt={alt.source}
              title={`También en ${SOURCE_NAMES[alt.source]}${alt.episode !== episode ? ` (allí es el episodio ${alt.episode})` : ""}`}
              className="h-6 w-6 rounded-full shadow-md"
            />
          ))}
          <img
            src={SOURCE_ICONS[source]}
            alt={source}
            className="h-6 w-6 rounded-full shadow-md"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div
          className="flex items-center gap-1 text-xs font-bold rounded-full px-3 py-1"
          style={{ backgroundColor: badgeColor, color: "#fff" }}
        >
          <span>{source.toUpperCase()}</span>
        </div>
        
        {isFinished && !isPremiere && (
          <span
            className="text-[0.65rem] font-bold rounded-full mx-2 px-2 py-1 shadow-md"
            style={{
              background: "linear-gradient(90deg, #020024, #B80B19, #FF001A)",
              color: "#fff",
              border: "1px solid rgba(250, 50, 46, 0.8)"
            }}
          >
            FINALIZADO
          </span>
        )}

        {isPremiere && (
          <span
            className="text-[0.65rem] font-bold rounded-full mx-2 px-4 py-1 shadow-md"
            style={{
              background: "linear-gradient(90deg, #f6e27a, #f1c40f, #e2b007)",
              color: "#fff",
              border: "1px solid rgba(255, 215, 0, 0.8)"
            }}
          >
            ESTRENO
          </span>
        )}

        <div className="ml-auto flex items-center">
          {loading && (
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          )}
          {!loading && error && (
            <div className="relative group">
              <AlertCircle className="w-5 h-5 text-red-600 cursor-default" />
              <div className="absolute z-10 hidden group-hover:block w-56 text-xs text-white bg-black px-3 py-2 rounded shadow top-full left-1/2 -translate-x-1/2 mt-1 text-center whitespace-normal">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && downloads && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="transition-colors cursor-pointer"
              style={{ color: "var(--muted)" }}
              title="Mostrar enlaces de descarga"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-base font-semibold mt-2 truncate hover:underline"
        title={title}
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </a>
      {agoLabel && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
          {agoLabel}
        </p>
      )}
      {isModalOpen && downloads && (
        <DownloadModal downloads={downloads} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

export default AnimeCard;