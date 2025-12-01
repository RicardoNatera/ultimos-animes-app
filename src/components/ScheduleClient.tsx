"use client";

import { useEffect, useState } from "react";
import Loader from '@/components/Loader';

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function ScheduleClient() {
  const [schedule, setSchedule] = useState<Record<string, any[]> | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    return DAYS[(today + 6) % 7];
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/schedule", { cache: "no-store" });
        const json = await res.json();
        if(json.response.success){
          console.log(json.response.schedule)
          setSchedule(json.response.schedule);
        }else{
          console.error("Error cargando horario:", json.response.success);
        }
        
      } catch (err) {
        console.error("Error cargando horario:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedDay === day
                ? "bg-cyan-400 text-black"
                : "bg-[var(--panel)] hover:bg-[var(--panel-hover)]"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {loading && <Loader/>}

      {!loading && schedule && (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {(schedule[selectedDay] || []).map((anime, i) => (
            <a
              key={i}
              href={anime.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--panel)] rounded-xl overflow-hidden shadow hover:scale-[1.02] transition cursor-pointer"
            >
              <img
                src={anime.image}
                className="w-full h-56 object-cover"
                alt={anime.title}
              />

              <div className="p-3">
                <span className="text-xs bg-gray-600/40 px-2 py-1 rounded mb-2 inline-block">
                  {anime.type ?? "TV Anime"}
                </span>

                <h2 className="font-semibold mt-2 leading-tight">
                  {anime.title}
                </h2>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
