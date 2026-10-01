import { getScheduleList } from "@/lib/scrapers/scraper";

export async function GET() {
  try {
    const animes = await getScheduleList();
    return Response.json(
      { animes },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "Error al obtener el horario" },
      { status: 502 }
    );
  }
}