import { reduceAnimes } from "@/lib/sources";
import AnimeCard from "@/components/AnimeCard"
import { ScrapedAnime } from "@/types/anime";

export default async function Home() {
  const animes = await reduceAnimes()
  console.log(animes);
  return (
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {
      animes.map((anime:ScrapedAnime, idx) => (
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
