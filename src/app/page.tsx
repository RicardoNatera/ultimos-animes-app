import Image from "next/image";
import AnimeCard from "@/components/AnimeCard"

export default function Home() {
  return (
    <main className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <AnimeCard
        title="Sakamoto Days"
        imageUrl="https://www3.animeflv.net/uploads/animes/thumbs/4125.jpg"
        source="animeflv"
        sourceUrl="https://www3.animeflv.net/ver/sakamoto-days-14"
      />
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
      
    </main>
  );
}
