import { debugMAL, getFavoriteInfo } from "@/lib/scrapers/favoriteInfo";

// Búsqueda en MAL + ficha de MAL + 2 búsquedas, con reintentos
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "").trim();

  if (!title || title.length > 200) {
    return Response.json({ error: "título inválido" }, { status: 400 });
  }
    // Diagnóstico (solo en desarrollo): ?title=...&debug=1
  if (
    searchParams.get("debug") === "1" &&
    process.env.NODE_ENV !== "production"
  ) {
    return Response.json(await debugMAL(title));
  }
  try {
    const info = await getFavoriteInfo(title);

    // Resultado completo: 6 h. Si faltó la ficha o ambos enlaces
    // (puede ser un fallo temporal), solo 5 min para reintentar pronto.
    const complete =
      info.mal !== null &&
      (info.links.animeav1 !== null || info.links.otakustv !== null);

    return Response.json(info, {
      headers: {
        "Cache-Control": complete
          ? "public, s-maxage=21600, stale-while-revalidate=86400"
          : "public, s-maxage=300",
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "fallo al obtener la info" }, { status: 502 });
  }
}