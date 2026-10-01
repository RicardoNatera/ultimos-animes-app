import { getScheduleItem } from "@/lib/scrapers/scraper";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ malId: string }> }
) {
  const { malId } = await params;

  if (!/^\d+$/.test(malId)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const item = await getScheduleItem(Number(malId)); // puede ser null
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