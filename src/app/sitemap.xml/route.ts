const BASE_URL = "https://pushanime.vercel.app";

// /search y /favorites no se incluyen: la primera necesita una búsqueda y la segunda es personal
const PAGES = [
  { path: "", changefreq: "hourly", priority: "1.0" },
  { path: "/schedule", changefreq: "daily", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.3" },
  { path: "/credits", changefreq: "monthly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
];

export async function GET() {
  const urls = PAGES.map(
    ({ path, changefreq, priority }) => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}