import { getScheduleItem, isScheduledAnime } from "@/lib/scrapers/scraper";

// Con reintentos, el peor caso es ~30 s (3 intentos de 10 s)
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ malId: string }> }
) {
  const { malId } = await params;

  if (!/^\d+$/.test(malId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  const id = Number(malId);

  try {
    // Solo ids que están en el calendario actual
    if (!(await isScheduledAnime(id))) {
      return Response.json(
        { error: "anime fuera del calendario" },
        { status: 404 }
      );
    }

    const item = await getScheduleItem(id); // puede ser null
    return Response.json(
      { item },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "fallo MAL" }, { status: 502 });
  }
}