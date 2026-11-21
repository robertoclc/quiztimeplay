// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://quiztimeplay.com.br",
  output: "server",
  adapter: cloudflare({
    prerenderEnvironment: "node",
  }),
  trailingSlash: "never",
  integrations: [sitemap()],
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
});