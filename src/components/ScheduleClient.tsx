"use client";

import { useEffect, useMemo, useState } from "react";
import Loader from "@/components/Loader";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

type Item = { malId: number; title: string; image: string; day: string };

type Details = {
  day: string;
  title: string;
  url: string;
  image: string;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  airedFrom?: string | null;
  firstBroadcast?: string | null;
  broadcastTime: string;
  period: string;
};

type Card = Partial<Details> & {
  malId: number;
  title: string;
  image: string;
  url: string;
  pending: boolean;
};

// Ejecuta `worker` sobre todos los items con un máximo de `limit` a la vez
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (x: T) => Promise<void>
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        await worker(items[next++]);
      }
    })
  );
}

const MONTHS: Record<string, string> = {
  Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", May: "may", Jun: "jun",
  Jul: "jul", Aug: "ago", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dic",
};
const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];
const WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// "2026-10-02" -> "vie 2 oct 2026"
// "Oct 2026"   -> "oct 2026"  |  otro texto -> tal cual
function formatAired(raw: string): string {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    // getUTCDay sobre una fecha UTC: el día de la semana no se desplaza
    const weekday = WEEKDAYS_ES[new Date(Date.UTC(+y, +m - 1, +d)).getUTCDay()];
    return `${weekday} ${Number(d)} ${MONTHS_ES[Number(m) - 1]} ${y}`;
  }

  const month = raw.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (month && MONTHS[month[1]]) return `${MONTHS[month[1]]} ${month[2]}`;

  return raw;
}

function StatusBadge({
  status,
  airedFrom,
  firstBroadcast,
}: {
  status: string;
  airedFrom?: string | null;
  firstBroadcast?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (status === "Currently Airing") {
    return (
      <span className="text-xs bg-green-600/40 px-2 py-1 rounded">{status}</span>
    );
  }

  if (status === "Not yet aired") {
    const premiere = airedFrom ? formatAired(airedFrom) : null;
    // Solo lo mostramos aparte si es distinta (hubo streaming anticipado)
    const tv =
      firstBroadcast && firstBroadcast !== airedFrom
        ? formatAired(firstBroadcast)
        : null;

    const text = premiere
      ? tv
        ? `Estreno: ${premiere} · TV: ${tv}`
        : `Estreno: ${premiere}`
      : null;

    return (
      <>
        <span className="text-xs bg-red-600/40 px-2 py-1 rounded inline-flex items-center gap-1">
          {status}
          {text && (
            <button
              type="button"
              title={text}
              aria-label={text}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              className="w-4 h-4 rounded-full border border-current text-[10px] leading-none font-bold hover:bg-white/20"
            >
              ?
            </button>
          )}
        </span>
        {text && open && (
          <span className="text-xs bg-amber-600/40 px-2 py-1 rounded">
            {text}
          </span>
        )}
      </>
    );
  }

  return <span className="text-xs bg-red-600/40 px-2 py-1 rounded">{status}</span>;
}
function todayName() {
  const today = new Date().getDay();
  return DAYS[(today + 6) % 7];
}
export default function ScheduleClient() {
  const [list, setList] = useState<Item[]>([]);
  const [details, setDetails] = useState<Record<number, Details | null>>({});
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);

  const [selectedDay, setSelectedDay] = useState(todayName);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fase 1: lista rápida
        const res = await fetch("/api/schedule");
        const json = await res.json();
        if (cancelled || !json.animes) return;

        setList(json.animes);
        setLoading(false); // ya se puede pintar el calendario

        // Fase 2: detalle de cada anime, 6 a la vez
        const i = DAYS.indexOf(todayName());
        const priority = new Set([DAYS[i], DAYS[(i + 1) % 7]]);
        const ordered = [...json.animes].sort(
          (a: Item, b: Item) => Number(priority.has(b.day)) - Number(priority.has(a.day))
        );

        await runPool<Item>(ordered, 6, async (a) => {
          try {
            const r = await fetch(`/api/schedule/${a.malId}`);
            if (!r.ok) return;
            const { item } = await r.json();
            if (!cancelled) {
              setDetails((prev) => ({ ...prev, [a.malId]: item }));
            }
          } catch {
            // se queda como tarjeta provisional
          } finally {
            if (!cancelled) setDone((d) => d + 1);
          }
        });
      } catch (err) {
        console.error("Error cargando horario:", err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const schedule = useMemo(() => {
    const out: Record<string, Card[]> = {};

    for (const a of list) {
      const d = details[a.malId];
      if (d === null) continue; // descartado (infantil / sin horario)

      const day = d ? d.day : a.day; // sin detalle: día provisional de MAL
      const card: Card = d
        ? { ...d, malId: a.malId, pending: false }
        : {
            malId: a.malId,
            title: a.title,
            image: a.image,
            url: `https://myanimelist.net/anime/${a.malId}`,
            pending: true,
          };

      (out[day] ??= []).push(card);
    }

    for (const day of Object.keys(out)) {
      out[day].sort((x, y) =>
        x.pending !== y.pending
          ? Number(x.pending) - Number(y.pending)
          : (x.broadcastTime ?? "").localeCompare(y.broadcastTime ?? "")
      );
    }

    return out;
  }, [list, details]);

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

      {loading && <Loader />}

      {!loading && list.length > 0 && done < list.length && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 bg-[var(--panel)] rounded-xl px-4 py-3 mb-5"
        >
          <div className="cat-loader cat-loader--mini" />

          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="opacity-80">Ajustando horarios a tu zona…</span>
              <span className="opacity-60 tabular-nums">
                {done}/{list.length}
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${Math.round((done / list.length) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {(schedule[selectedDay] || []).map((anime) => (
            <a
              key={anime.malId}
              href={anime.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--panel)] rounded-xl overflow-hidden shadow hover:scale-[1.02] transition cursor-pointer relative"
            >
              <span
                className="absolute top-2 right-2 text-xs font-bold rounded px-2 py-1 shadow-md"
                style={{
                  backgroundColor: "var(--scroll-thumb)",
                  color: "var(--badge-fg)",
                }}
              >
                {anime.pending
                  ? "…"
                  : `${anime.broadcastTime} ${anime.period}`}
              </span>
              <img
                src={anime.image}
                className="w-full h-56 object-cover"
                alt={anime.title}
                loading="lazy"
                decoding="async"
              />
              <div className="p-3">
                {!anime.pending && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs bg-blue-600/40 px-2 py-1 rounded">
                      {anime.type ?? "TV Anime"} • {anime.episodes ?? "N/A"} ep
                    </span>
                    <StatusBadge
                      status={anime.status ?? ""}
                      airedFrom={anime.airedFrom}
                      firstBroadcast={anime.firstBroadcast}
                    />
                    <span className="text-xs bg-yellow-600/40 px-2 py-1 rounded">
                      ⭐ {anime.score ?? "N/A"}
                    </span>
                  </div>
                )}
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