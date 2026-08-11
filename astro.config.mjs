// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://quiztimeplay.com.br",
  integrations: [sitemap()],
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
});