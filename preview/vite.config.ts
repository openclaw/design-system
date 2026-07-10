import { resolve } from "node:path";
import { defineConfig } from "vite";

const previewRoot = resolve(import.meta.dirname);

export default defineConfig({
  root: previewRoot,
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: resolve(previewRoot, "../dist/preview"),
    rollupOptions: {
      input: {
        overview: resolve(previewRoot, "index.html"),
        foundations: resolve(previewRoot, "foundations/index.html"),
        interface: resolve(previewRoot, "interface/index.html"),
        compositions: resolve(previewRoot, "compositions/index.html"),
      },
    },
  },
});
