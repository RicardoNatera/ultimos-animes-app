import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Helper para scraping de otakustv
async function getOtakusTVDownloads(originalUrl: string) {
  try {
    // Paso 1: Extraer partes de la URL
    const url = new URL(originalUrl);
    const parts = url.pathname.split("/").filter(Boolean); // ["anime", "kamitsubaki-shi-kensetsuchuu", "episodio-3"]
    if (parts.length < 3 || parts[0] !== "anime") {
      throw new Error("URL inválida para OtakusTV");
    }
    
    const animeSlug = parts[1];
    const episodeSlug = parts[2];

    // Paso 2: Construir URL de descarga
    const downloadUrl = `https://www1.otakustv.com/descargar/${animeSlug}/${episodeSlug}`;

    // Paso 3: Scraping
    const res = await fetch(downloadUrl);
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: { label: string; url: string }[] = [];

    $(".bloque_download .row.ln_bottom").each((_, el) => {
      const label = $(el).find(".col-sm-6.text-left").text().trim() || "Desconocido";
      const anchor = $(el).find("a").attr("href");
      if (anchor) {
        links.push({
          label: label || "Descarga",
          url: anchor,
        });
      }
    });

    return links;
  } catch (err) {
    console.error("OtakusTV scraping error:", err);
    return [];
  }
}

// Helper para scraping de animeflv
async function getAnimeFLVDownloads(url: string) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const links: { label: string; url: string }[] = [];

  $(".RTbl.Dwnl tbody tr").each((_, el) => {
    const tds = $(el).find("td");
    const server = $(tds[0]).text().trim();
    const type = $(tds[2]).text().trim(); // Debe ser SUB
    const link = $(tds[3]).find("a").attr("href");

    if (type === "SUB" && link) {
      links.push({
        label: server,
        url: link,
      });
    }
  });

  return links;
}


// Helper para scraping de animeav1
async function getAnimeAV1Downloads(url: string) {
  const res = await fetch(url);
  const html = await res.text();
  const links: { label: string; url: string }[] = [];


  // Cargamos el HTML con cheerio
  const $ = cheerio.load(html);

  // Buscamos el script que contiene "downloads"
  const scripts = $("script").toArray();

  for (const script of scripts) {
    const content = $(script).html();
    
    if (content && content.includes('downloads:')) {
      // Extraer el bloque "downloads":{...} con regex
      const match = content.match(/downloads:\s*({[\s\S]*})\s*,\s*(?:\"uses\"|uses)\s*:/);
      if (match) {
      let jsonString = match[1];
      let aux = Array.from(jsonString)
      aux.pop()
      jsonString = aux.join("")
      jsonString = jsonString
      .replace(/([{,])(\s*)(\w+)\s*:/g, '$1"$3":') // Poner comillas en las claves
      .replace(/'([^']+)'/g, '"$1"') // Opcional: por si acaso usan comillas simples en strings
      .replace(/"([^"]+)":\s*undefined/g, '"$1":null'); // Reemplazar `undefined` si apareciera
      try {
        const downloadsJSON = JSON.parse(jsonString);
        if (downloadsJSON?.SUB) {
          for (const entry of downloadsJSON.SUB) {
            links.push({
              label: entry.server,
              url: entry.url,
            });
          }
        }
        return links;
      } catch (err) {
        console.error("Error al parsear downloads:", err);
      }
    }
    }
  }

  return links;
}

export async function GET(req: NextRequest) {
    
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const url = searchParams.get("url");

  if (!source || !url) {
    return NextResponse.json({ error: "Missing source or url" }, { status: 400 });
  }

  try {
    if (source === "animeav1") {
      const links = await getAnimeAV1Downloads(url);
      return NextResponse.json({ success: true, links });
    }
    if (source === "animeflv") {
      const links = await getAnimeFLVDownloads(url);
      return NextResponse.json({ success: true, links });
    }
    if (source === "otakustv") {
      const links = await getOtakusTVDownloads(url);
      return NextResponse.json({ success: true, links });
    }

    return NextResponse.json({ error: "Unsupported source" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Scraping failed", details: String(err) }, { status: 500 });
  }
}
