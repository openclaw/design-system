import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { bindApplicationModelControls } from "../preview/application-model-controls.js";
import {
  bindApplicationComposer,
  bindApplicationNavigation,
  getWorkbenchControlOptions,
  getWorkbenchDefinition,
  normalizeWorkbenchState,
} from "../preview/component-workbench-config.js";
import { isComponentWorkbenchPage } from "../preview/component-workbench.js";
import { registeredIconNames } from "../preview/lucide.js";
import { referencePages } from "../preview/navigation.js";

// These guards exist because workbench markup is plain strings and binders
// query it by attribute: nothing else fails when the two drift apart. Every
// binder selector must be reachable in at least one rendered state, and every
// icon name must resolve in the curated lucide registry (unregistered names
// render as nothing).

const sharedBinderSources: Record<string, string> = {
  bindApplicationModelControls: bindApplicationModelControls.toString(),
  bindApplicationComposer: bindApplicationComposer.toString(),
  bindApplicationNavigation: bindApplicationNavigation.toString(),
};

// Hooks a shared binder queries that a page intentionally never renders.
const binderSelectorExceptions: Record<string, string[]> = {
  // Quick Chat has no talk mode, camera, or hold-to-dictate live status.
  "application-quick-chat": [
    "data-workbench-composer-talk",
    "data-workbench-composer-camera",
    "data-workbench-composer-dictation-status",
  ],
};

const workbenchPageIds = referencePages
  .map(({ id }) => id)
  .filter((id) => isComponentWorkbenchPage(id) && getWorkbenchDefinition(id));

function binderSourceFor(definition: { bind?: (...args: unknown[]) => void }) {
  if (!definition.bind) return "";
  let source = definition.bind.toString();
  for (const [name, sharedSource] of Object.entries(sharedBinderSources)) {
    if (source.includes(name)) source += sharedSource;
  }
  return source;
}

function stateVariants(definition: {
  controls: { id: string; type: string; options?: unknown }[];
}) {
  const base = normalizeWorkbenchState(definition);
  const variants: Record<string, unknown>[] = [{ ...base }];
  const axes = definition.controls.map((control) => ({
    id: control.id,
    values:
      control.type === "toggle"
        ? [true, false]
        : getWorkbenchControlOptions(control).map(({ value }) => value),
  }));
  for (const axis of axes) {
    for (const value of axis.values) {
      variants.push({ ...base, [axis.id]: value });
    }
  }
  // Pairwise combinations catch hooks that only render when two states align,
  // e.g. camera controls need voice active while the session is not busy.
  for (let left = 0; left < axes.length; left += 1) {
    for (let right = left + 1; right < axes.length; right += 1) {
      for (const leftValue of axes[left].values) {
        for (const rightValue of axes[right].values) {
          variants.push({
            ...base,
            [axes[left].id]: leftValue,
            [axes[right].id]: rightValue,
          });
        }
      }
    }
  }
  return variants;
}

function renderedCorpus(pageId: string) {
  const definition = getWorkbenchDefinition(pageId);
  if (!definition?.markup) return "";
  return stateVariants(definition)
    .map((state) => definition.markup(state))
    .join("\n");
}

describe("workbench markup and binder contract", () => {
  test("every binder hook selector renders in at least one state", () => {
    const failures: string[] = [];
    for (const pageId of workbenchPageIds) {
      const definition = getWorkbenchDefinition(pageId);
      const source = binderSourceFor(definition);
      if (!source) continue;
      const selectors = new Set(
        [...source.matchAll(/\[(data-workbench-[a-z-]+)\]/g)].map((match) => match[1]),
      );
      if (selectors.size === 0) continue;
      const corpus = renderedCorpus(pageId);
      const allowed = new Set(binderSelectorExceptions[pageId] ?? []);
      for (const selector of selectors) {
        if (allowed.has(selector)) continue;
        if (!corpus.includes(selector)) {
          failures.push(`${pageId}: binder queries ${selector} but no state renders it`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test("all icon names in rendered and source markup are registered", () => {
    const registered = new Set(registeredIconNames);
    const failures = new Set<string>();
    const collect = (markup: string, origin: string) => {
      for (const match of markup.matchAll(/data-lucide="([a-z0-9-]+)"/g)) {
        if (!registered.has(match[1])) failures.add(`${origin}: ${match[1]}`);
      }
    };
    for (const pageId of workbenchPageIds) collect(renderedCorpus(pageId), pageId);
    const previewDir = join(import.meta.dir, "../preview");
    for (const file of readdirSync(previewDir)) {
      if (!/\.(js|jsx|html)$/.test(file)) continue;
      collect(readFileSync(join(previewDir, file), "utf8"), file);
    }
    expect([...failures].sort()).toEqual([]);
  });
});
