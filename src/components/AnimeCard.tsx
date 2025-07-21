type Props = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  source: "animeflv" | "animeav1" | "otakustv";
};

function AnimeCard({ title, imageUrl, source, sourceUrl }: Props) {
  const badgeColor = source === "animeflv"
    ? "bg-yellow-500"
    : source === "animeav1"
        ? "bg-green-500"
        : "bg-purple-500";
  return (
    <a target="_blank" rel="noopener noreferrer" href={sourceUrl} className="rounded-xl shadow-md overflow-hidden bg-white p-3 w-60">
        <img src={imageUrl} className="w-full h-40 object-cover rounded-t-xl"/>
        <h2 className="text-base font-semibold mt-2 truncate text-black">{title}</h2>
        <span className={`${badgeColor} text-xs uppercase font-bold rounded-full px-2 py-1 mt-1`}>{source}</span>
    </a>
  );
}
export default AnimeCard;
