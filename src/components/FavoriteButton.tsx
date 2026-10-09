"use client";

import { Star } from "lucide-react";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import type { SourceName } from "@/types/sourceVars";

type Props = {
  title: string;
  image: string;
  source: SourceName;
  sourceUrl: string;
  className?: string;
};

export default function FavoriteButton({
  title,
  image,
  source,
  sourceUrl,
  className = "",
}: Props) {
  const { isFavorite } = useFavorites();
  const active = isFavorite(title);
  const label = active ? "Quitar de favoritos" : "Añadir a favoritos";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggleFavorite({ title, image, source, sourceUrl }) === "full") {
          window.alert(
            "Llegaste al límite de espacio para favoritos. Quita alguno para poder añadir más."
          );
        }
      }}
      className={`rounded-full p-1.5 bg-black/50 hover:bg-black/70 transition cursor-pointer ${className}`}
    >
      <Star
        size={18}
        className={active ? "fill-yellow-400 text-yellow-400" : "text-white"}
      />
    </button>
  );
}