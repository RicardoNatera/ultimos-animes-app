import {fetchSchedule} from "@/lib/scrapers/scraper"

export async function GET() {
  try {
    const result = await fetchSchedule();
    const response = await result.json()
    //console.log("api",response)
    return Response.json({
      response
    });
  } catch (error) {
    console.error("Error scraping el horario:", error);
    return Response.json(
      { success: false, error: "Error al obtener datos del horario" },
      { status: 500 }
    );
  }
}
