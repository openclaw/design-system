import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { tokenDefinitions, tokenGroups } from "../preview/token-catalog.js";

describe("preview", () => {
  test("loads canonical package exports", async () => {
    const css = await readFile("preview/preview.css", "utf8");
    for (const path of [
      "../styles/tokens.css",
      "../styles/themes.css",
      "../styles/typography.css",
      "../styles/themes/product.css",
      "../styles/base.css",
    ]) {
      expect(css).toContain(`@import "${path}"`);
    }
  });

  test("publishes the reference areas as separate routes", async () => {
    const pages = await Promise.all(
      [
        ["overview", "preview/index.html"],
        ["foundations", "preview/foundations/index.html"],
        ["interface", "preview/interface/index.html"],
        ["compositions", "preview/compositions/index.html"],
      ].map(async ([route, path]) => ({
        route,
        html: await readFile(path, "utf8"),
      })),
    );

    for (const { route, html } of pages) {
      expect(html).toContain(`data-preview-route="${route}"`);
      expect(html).toContain("data-theme-choice");
    }

    const config = await readFile("preview/vite.config.ts", "utf8");
    expect(config).toContain('foundations: resolve(previewRoot, "foundations/index.html")');
    expect(config).toContain('interface: resolve(previewRoot, "interface/index.html")');
    expect(config).toContain('compositions: resolve(previewRoot, "compositions/index.html")');
  });

  test("lists every canonical token exactly once", async () => {
    const sources = await Promise.all(
      [
        "styles/tokens.css",
        "styles/themes.css",
        "styles/themes/product.css",
        "styles/typography.css",
      ].map((path) => readFile(path, "utf8")),
    );
    const canonical = new Set(
      sources.flatMap((source) =>
        [...source.matchAll(/^\s*(--oc-[\w-]+)\s*:/gm)].map(([, name]) => name),
      ),
    );
    const listed = tokenDefinitions.map(({ variable }) => variable);
    const listedSet = new Set(listed);
    const groupIds = new Set(tokenGroups.map(({ id }) => id));

    expect(listed).toHaveLength(listedSet.size);
    expect(tokenDefinitions.filter(({ group }) => !groupIds.has(group))).toEqual([]);
    expect([...listedSet].sort()).toEqual([...canonical].sort());
  });
});
