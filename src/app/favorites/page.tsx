import type { Metadata } from "next";
import FavoritesClient from "@/components/FavoritesClient";

export const metadata: Metadata = {
  title: "Favoritos",
  robots: { index: false }, // es una página personal
};

export default function FavoritesPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-2">Favoritos</h1>
      <p className="text-sm opacity-70 mb-6">
        Se guardan en este navegador. Marca la ⭐ en las tarjetas de la página
        principal para añadirlos aquí.
      </p>

      <FavoritesClient />
    </div>
  );
}