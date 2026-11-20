import { handle } from "@astrojs/cloudflare/handler";
import youtubeWorker from "./index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Mantém a API do YouTube existente
    if (url.pathname === "/api/youtube") {
      return youtubeWorker.fetch(request, env, ctx);
    }

    // Cache das páginas que carregam centenas de vídeos
    if (
      request.method === "GET" &&
      (url.pathname === "/quizzes" || url.pathname === "/shorts")
    ) {
      const cache = caches.default;
      const cacheKey = new Request(request.url, request);

      let response = await cache.match(cacheKey);

      // Se já estiver em cache, entrega imediatamente
      if (response) {
        return response;
      }

      // Primeira visita: gera a página normalmente
      response = await handle(request, env, ctx);

      // Guarda a página para as próximas visitas
      if (response.ok) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;
    }

    // Demais páginas continuam normalmente
    return handle(request, env, ctx);
  },

  // Mantém o cron de 12 em 12 horas
  async scheduled(controller, env, ctx) {
    return youtubeWorker.scheduled(controller, env, ctx);
  }
};