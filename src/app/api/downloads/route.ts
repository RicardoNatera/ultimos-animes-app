import { NextRequest, NextResponse } from "next/server";
import { getDefaultScraperHeaders, fetchAnimeAV1Status, fetchAnimeFLVStatus, fetchOtakusTVStatus } from "@/lib/scrapers/scraper"
import * as cheerio from "cheerio";
import { SOURCE_LINKS, type SourceName } from "@/types/sourceVars";

// Helper para scraping de otakustv
function extractLabel(url: string): string {
  try {
    const { hostname } = new URL(url);

    // Quitar "www." si existe
    const cleanHost = hostname.startsWith("www.")
      ? hostname.slice(4)
      : hostname;

    // Tomar solo la primera parte
    return cleanHost.split(".")[0].charAt(0).toUpperCase() + cleanHost.split(".")[0].slice(1);
  } catch {
    return "Descarga";
  }
}

async function getOtakusTVDownloads(originalUrl: string) {
  type DownloadEntry = [string, string];
  try {
    const res = await fetch(originalUrl,{headers: getDefaultScraperHeaders()});
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: { label: string; url: string }[] = [];
    
    const downloadBtn = $('a.ep-btn.d');
    const raw = downloadBtn.attr('data-dwn');
    if (raw) {
      const clean = raw.replace(/\\\//g, "/");

      let downloads: DownloadEntry[] = [];

      try {
        downloads = JSON.parse(clean) as DownloadEntry[];
      } catch (err) {
        console.error("Error al parsear data-dwn:", err);
      }

      const linksRaw = downloads.map(d => d[1]);

      for (const rawUrl of linksRaw) {
        links.push({
          label: extractLabel(rawUrl),
          url: rawUrl
        });
      }
    }

    return links;
  } catch (err) {
    console.error("OtakusTV scraping error:", err);
    return [];
  }
}

// Helper para scraping de animeflv
async function getAnimeFLVDownloads(url: string) {
  const res = await fetch(url,{headers: getDefaultScraperHeaders()});
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
  const res = await fetch(url,{headers: getDefaultScraperHeaders()});
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

// Quita "www." para tolerar variantes (www.otakustv.net / otakustv.net)
const normalizeHost = (host: string) => host.replace(/^www\./, "");

/**
 * Solo permite URLs https que pertenezcan al dominio de la fuente indicada.
 * Evita que alguien use /api/downloads para hacer que el servidor
 * pida URLs arbitrarias (SSRF).
 */
function isAllowedUrl(source: string, raw: string | null): boolean {
  if (!raw) return false;
  if (!Object.prototype.hasOwnProperty.call(SOURCE_LINKS, source)) return false;

  try {
    const allowedHost = normalizeHost(
      new URL(SOURCE_LINKS[source as SourceName]).hostname
    );
    const u = new URL(raw);
    return u.protocol === "https:" && normalizeHost(u.hostname) === allowedHost;
  } catch {
    return false;
  }
}

function ok(links: { label: string; url: string }[], finished: boolean) {
  // Con enlaces: 10 min. Sin enlaces (episodio recién publicado): solo 1 min
  const ttl = links.length > 0 ? 600 : 60;
  return NextResponse.json(
    { success: true, links, finished },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=3600`,
      },
    }
  );
}
export async function GET(req: NextRequest) {
    
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const url = searchParams.get("url");
  const urlFinished = searchParams.get("urlFinished");

  if (!source || !url) {
    return NextResponse.json({ error: "Missing source or url" }, { status: 400 });
  }

  if (
    !isAllowedUrl(source, url) ||
    (urlFinished && !isAllowedUrl(source, urlFinished))
  ) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    if (source === "animeav1") {
      const [links, finished] = await Promise.all([
        getAnimeAV1Downloads(url),
        urlFinished ? fetchAnimeAV1Status(urlFinished) : Promise.resolve(false),
      ]);
      return ok(links, finished);
    }
    if (source === "animeflv") {
      const [links, finished] = await Promise.all([
        getAnimeFLVDownloads(url),
        urlFinished ? fetchAnimeFLVStatus(urlFinished) : Promise.resolve(false),
      ]);
      return ok(links, finished);
    }
    if (source === "otakustv") {
      const [links, finished] = await Promise.all([
        getOtakusTVDownloads(url),
        urlFinished ? fetchOtakusTVStatus(urlFinished) : Promise.resolve(false),
      ]);
      return ok(links, finished);
    }

    return NextResponse.json({ error: "Unsupported source" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Scraping failed", details: String(err) }, { status: 500 });
  }
}
