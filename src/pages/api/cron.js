
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

    const cacheDeleted = await cache.delete(
      "https://cache.youtube/all-content"
    );

    console.log(
      "Resultado da limpeza do cache:",
      cacheDeleted ? "Cache removido" : "Chave não encontrada"
    );

    console.log(
      "Limpeza executada em:",
      new Date().toISOString()
    );

    return new Response(
      cacheDeleted
        ? "Cache do YouTube removido com sucesso"
        : "Nenhum cache encontrado para remover",
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao limpar cache:", error);

    return new Response("Erro ao limpar cache", {
      status: 500,
    });
  }
}
