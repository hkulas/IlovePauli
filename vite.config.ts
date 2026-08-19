import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.CI === "true" || process.env.GITHUB_PAGES === "true" ? "/IlovePauli/" : "/",
  test: {
    environment: "node",
  },
});
