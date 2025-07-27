export function GET() {
  return new Response(
    `User-agent: *
Allow: /
Sitemap: https://pushanime.vercel.app/sitemap.xml`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
}
