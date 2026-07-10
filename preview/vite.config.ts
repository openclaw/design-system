import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { defineConfig } from "vite";

const previewRoot = resolve(import.meta.dirname);

function collectHtmlInputs(directory) {
  const inputs = {};

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(inputs, collectHtmlInputs(path));
    } else if (entry.name === "index.html") {
      const name = relative(previewRoot, directory).replaceAll("/", "-") || "overview";
      inputs[name] = path;
    }
  }

  return inputs;
}

export default defineConfig({
  root: previewRoot,
  base: "./",
  build: {
    emptyOutDir: true,
    outDir: resolve(previewRoot, "../dist/preview"),
    rollupOptions: { input: collectHtmlInputs(previewRoot) },
  },
});
