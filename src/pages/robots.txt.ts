import type { APIRoute } from "astro";

export const GET: APIRoute = () => {
  const robots = `User-agent: *

Allow: /

Sitemap: https://quiztimeplay.com.br/sitemap-index.xml`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};