import { reduceAnimes } from "@/lib/sources";
import AnimeCard from "@/components/AnimeCard"
import { ScrapedAnime } from "@/types/anime";

export default async function Home() {
  const start = performance.now();
  const animes = await reduceAnimes();
  const end = performance.now();
  console.log(`[Perf] Tiempo total reduceAnimes: ${(end - start).toFixed(2)} ms`);

  return (
    <section className="grid gap-4 justify-items-center max-w-7xl mx-auto grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {animes.map((anime: ScrapedAnime, idx) => (
        <AnimeCard
          key={idx}
          title={anime.title}
          imageUrl={anime.image}
          episode={anime.episode}
          source={anime.source}
          sourceUrl={anime.url}
        />
      ))}
    </section>
  );
}