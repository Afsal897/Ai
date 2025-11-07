import { defineConfig } from "vitest/config"; //  Fix is here
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setup.ts",
    coverage: {
      provider: "v8", // or 'istanbul' (optional)
      reporter: ["text", "json", "html"], // text for terminal, html for detailed UI
      exclude: [
        "src/routes/**",
        "src/services/**",
        "node_modules",
        "**/node_modules/**",
        "**/dist/**",
        "**/bun-types.test.ts",
        "**/*.config.js",
        "**/*.config.ts",
        "**/vite-env.d.ts",
        "**/main.tsx",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
