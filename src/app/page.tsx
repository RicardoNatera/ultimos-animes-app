import { getLatestFromFLV } from "@/lib/sources";
import AnimeCard from "@/components/AnimeCard"

export default async function Home() {
  const animes = await getLatestFromFLV();

  return (
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {animes.map((anime:{ title: string; url: string; image: string }, idx) => (
        <AnimeCard
          key={idx}
          title={anime.title}
          imageUrl={anime.image}
          source="animeflv"
          sourceUrl={anime.url}
        />
      ))}
      
      <AnimeCard
        title="Kijin Gentoushou"
        imageUrl="https://cdn.animeav1.com/thumbnails/784.jpg"
        source="animeav1"
        sourceUrl="https://animeav1.com/media/kijin-gentoushou/15"
      />
      <AnimeCard
        title="Yami Shibai"
        imageUrl="https://www1.otakustv.com/storage/portadas/8/29/1752463139.jpg"
        source="otakustv"
        sourceUrl="https://www1.otakustv.com/anime/yami-shibai-15/episodio-2"
      />
          </section>

      
  );
}
