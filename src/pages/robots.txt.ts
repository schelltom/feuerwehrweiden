import type { APIRoute } from 'astro';

// robots.txt wird beim Build erzeugt und zeigt automatisch auf die Sitemap
// unter der jeweils in astro.config.mjs gesetzten `site`-Domain.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;
  const body = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${sitemap}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
