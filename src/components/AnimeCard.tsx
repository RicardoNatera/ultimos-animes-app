'use client'

import { useEffect, useState } from "react";
import { SOURCE_ICONS, SourceName } from "@/types/sourceVars";
import DownloadModal from "@/components/DownloadModal";
import { Download, Loader2, AlertCircle } from "lucide-react";

type Props = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  episode: number;
  source: SourceName;
};

function AnimeCard({ title, imageUrl, source, sourceUrl, episode }: Props) {
  const badgeColor = source === "animeflv"
    ? "#facc15" // amarillo
    : source === "animeav1"
      ? "#16a34a" // verde
      : "#9333ea"; // morado

  const [downloads, setDownloads] = useState<{ label: string; url: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const res = await fetch(`/api/downloads?source=${source}&url=${encodeURIComponent(sourceUrl)}`);
        const json = await res.json();
        if (json.success && json.links.length > 0) {
          setDownloads(json.links);
          setError("");
        } else {
          setDownloads(null);
          setError("No se encontraron enlaces de descarga.");
        }
      } catch (err) {
        setError("Error al conectar con la fuente.");
      } finally {
        setLoading(false);
      }
    };

    fetchDownloads();
  }, [source, sourceUrl]);

  return (
    <div
      className="rounded-xl shadow-md overflow-visible p-3 w-full flex flex-col relative"
      style={{ backgroundColor: "var(--panel)", color: "var(--foreground)" }}
    >
      <div className="relative w-full aspect-3/2">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover rounded-t-xl hover:brightness-95 transition cursor-pointer"
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
        <img
          src={SOURCE_ICONS[source]}
          alt={source}
          className="h-6 w-6 rounded-full absolute top-2 right-2 shadow-md"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div
          className="flex items-center gap-1 text-xs font-bold rounded-full px-3 py-1"
          style={{ backgroundColor: badgeColor, color: "#fff" }}
        >
          <span>{source.toUpperCase()}</span>
        </div>

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

      {isModalOpen && downloads && (
        <DownloadModal downloads={downloads} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

export default AnimeCard;
