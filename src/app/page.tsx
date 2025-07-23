import { reduceAnimes } from "@/lib/sources";
import AnimeCard from "@/components/AnimeCard"

export default async function Home() {
  const animes = await reduceAnimes()

  return (
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {animes.map((anime:{ title: string; url: string; image: string; source: "animeflv" | "animeav1" | "otakustv"}, idx) => (
        <AnimeCard
          key={idx}
          title={anime.title}
          imageUrl={anime.image}
          source={anime.source}
          sourceUrl={anime.url}
        />
      ))}
          </section>

      
  );
}
