
import { env } from "cloudflare:workers";

export const prerender = false;

export async function POST({ request }) {
  const secret = env.CRON_SECRET;

  if (!secret) {
    return new Response("CRON_SECRET não configurado", {
      status: 500,
    });
  }

  const authorization = request.headers.get("Authorization");

  if (authorization !== `Bearer ${secret}`) {
    return new Response("Não autorizado", {
      status: 401,
    });
  }

  try {
    const cache = caches.default;

    await cache.delete(
      "https://cache.youtube/all-content"
    );

    console.log(
      "Cache do YouTube limpo:",
      new Date().toISOString()
    );

    return new Response("Cache do YouTube limpo", {
      status: 200,
    });
  } catch (error) {
    console.error("Erro ao limpar cache:", error);

    return new Response("Erro ao limpar cache", {
      status: 500,
    });
  }
}
