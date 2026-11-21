
import { env } from "cloudflare:workers";
import youtubeWorker from "../../index.js";

export const prerender = false;

export async function GET(context) {
  const ctx = context.locals.cfContext;

  return youtubeWorker.fetch(context.request, env, ctx);
}
