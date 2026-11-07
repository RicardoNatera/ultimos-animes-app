"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { getFavorites, setFavorites, useFavorites } from "@/lib/favorites";
import {
  MAX_IMPORT_BYTES,
  buildExport,
  exportFileName,
  mergeFavorites,
  parseImport,
  summarizeImport,
} from "@/lib/favoritesTransfer";

type Message = { kind: "ok" | "error"; text: string } | null;

const buttonClass =
  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition cursor-pointer hover:bg-[var(--panel-hover)] disabled:opacity-40 disabled:cursor-not-allowed";

const buttonStyle = {
  backgroundColor: "var(--panel)",
  color: "var(--foreground)",
  borderColor: "var(--accent-border)",
};

/** Botones para guardar una copia de los favoritos en un archivo y recuperarla. */
export default function FavoritesBackup({ className = "mt-6" }: { className?: string }) {
  const { favorites } = useFavorites();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message>(null);

  const handleExport = () => {
    const json = JSON.stringify(buildExport(favorites), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));

    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setMessage({
      kind: "ok",
      text: `Se guardó una copia de ${favorites.length} favoritos.`,
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ kind: "error", text: "El archivo es demasiado grande." });
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setMessage({ kind: "error", text: "No se pudo leer el archivo." });
      return;
    }

    const parsed = parseImport(text);
    if (!parsed.ok) {
      setMessage({ kind: "error", text: parsed.error });
      return;
    }
    if (parsed.favorites.length === 0 && parsed.invalid > 0) {
      setMessage({ kind: "error", text: "No se pudo leer ningún favorito del archivo." });
      return;
    }

    const result = mergeFavorites(getFavorites(), parsed.favorites);

    if (result.added > 0 && !setFavorites(result.merged)) {
      setMessage({
        kind: "error",
        text: "El navegador no tiene espacio para guardar los favoritos importados.",
      });
      return;
    }

    setMessage({ kind: "ok", text: summarizeImport(result, parsed.invalid) });
  };

  return (
    <section className={className}>
      <h3 className="text-sm font-semibold mb-1">Copia de seguridad</h3>
      <p className="text-xs opacity-60 mb-3">
        Tus favoritos solo existen en este navegador. Guarda una copia para no
        perderlos o para llevarlos a otro dispositivo.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={favorites.length === 0}
          className={buttonClass}
          style={buttonStyle}
        >
          <Download size={16} />
          Exportar
        </button>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={buttonClass}
          style={buttonStyle}
        >
          <Upload size={16} />
          Importar
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="Archivo de copia de seguridad de favoritos"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${
            message.kind === "ok" ? "text-green-500" : "text-red-500"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}