import ScheduleClient from "@/components/ScheduleClient";

export default function SchedulePage() {
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-4">Horario</h1>

      <p className="text-sm mb-6 p-3 bg-yellow-900/20 rounded border border-yellow-700/40">
        <strong>Aviso:</strong> Los animes que se muestran aquí son referenciales
        y pueden variar. {" "}
        <a
          href="https://myanimelist.net/anime/season"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded-md bg-blue-600/20 dark:bg-blue-400/20 text-blue-700 dark:text-blue-300 font-medium hover:brightness-110 transition"
        >
         My Anime List
        </a>
      </p>

      <ScheduleClient />
    </div>
  );
}
