
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(
  async (context, next) => {
    const { request } = context;
    const url = new URL(request.url);

    const paginasComCache = [
      "/quizzes",
      "/shorts",
    ];

    if (
      request.method !== "GET" ||
      !paginasComCache.includes(url.pathname)
    ) {
      return next();
    }

    const cache = caches.default;
    const cacheKey = new Request(request.url, request);

    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await next();

    if (response.ok) {
      context.locals.cfContext.waitUntil(
        cache.put(cacheKey, response.clone())
      );
    }

    return response;
  }
);
