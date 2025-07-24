type Props = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  episode: number;
  source: "animeflv" | "animeav1" | "otakustv";
};

function AnimeCard({ title, imageUrl, source, sourceUrl, episode }: Props) {
  const badgeColor = source === "animeflv"
    ? "bg-yellow-500"
    : source === "animeav1"
        ? "bg-green-500"
        : "bg-purple-500";
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={sourceUrl}
      className="rounded-xl shadow-md overflow-hidden bg-white p-3 w-60 flex flex-col"
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-40 object-cover rounded-t-xl"
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="bg-blue-500 text-white text-xs font-bold rounded px-2 py-1">
          Episodio {episode}
        </span>
        <span className={`${badgeColor} text-white text-xs font-bold rounded-full px-2 py-1`}>
          {source}
        </span>
      </div>

      <h2 className="text-base font-semibold mt-2 truncate text-black">{title}</h2>
    </a>

  );
}
export default AnimeCard;
