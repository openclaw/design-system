import { resolve } from "node:path";
import { defineConfig } from "vite";
import { createPreviewRouteStubsPlugin } from "./build-routes.js";

const previewRoot = resolve(import.meta.dirname);

export default defineConfig({
  root: previewRoot,
  base: "./",
  plugins: [createPreviewRouteStubsPlugin()],
  build: {
    emptyOutDir: true,
    outDir: resolve(previewRoot, "../dist/preview"),
    rollupOptions: {
      input: resolve(previewRoot, "index.html"),
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react")) return "preview-vendor";
          if (id.includes("/node_modules/lucide/")) return "preview-icons";
          return undefined;
        },
      },
    },
  },
});
