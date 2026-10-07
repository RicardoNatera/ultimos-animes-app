"use client";

import { useState } from "react";

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

export default function StatusBadge({
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