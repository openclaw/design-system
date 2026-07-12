import { readFile } from "node:fs/promises";

type CssNode = {
  prelude: string;
  body: string | null;
};

type ContractSnapshot = {
  version: string;
  sourceCommit: string;
  exports: Record<string, string>;
  stableClasses: string[];
  files: Record<string, Record<string, Record<string, string>>>;
};

type ContractState = Pick<
  ContractSnapshot,
  "exports" | "stableClasses" | "files"
>;

const manifestPath = "contracts/v0.0.1.json";
const contractFiles = [
  "styles/tokens.css",
  "styles/themes.css",
  "styles/themes/product.css",
  "styles/typography.css",
  "styles/base.css",
  "styles/components.css",
  "styles/compat/clawhub.css",
];
const stableExports = [
  ".",
  "./styles.css",
  "./tokens.css",
  "./themes.css",
  "./themes/product.css",
  "./typography.css",
  "./base.css",
  "./components.css",
  "./tailwind.css",
  "./compat/clawhub.css",
  "./package.json",
];

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function skipTrivia(value: string, start: number) {
  let index = start;
  while (index < value.length) {
    if (/\s/.test(value[index])) {
      index += 1;
      continue;
    }
    if (value.startsWith("/*", index)) {
      const end = value.indexOf("*/", index + 2);
      index = end === -1 ? value.length : end + 2;
      continue;
    }
    break;
  }
  return index;
}

function findBoundary(value: string, start: number, boundaries: Set<string>) {
  let quote = "";
  let parentheses = 0;
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (value.startsWith("/*", index)) {
      const end = value.indexOf("*/", index + 2);
      index = end === -1 ? value.length : end + 1;
      continue;
    }
    if (char === "(") parentheses += 1;
    else if (char === ")") parentheses -= 1;
    else if (parentheses === 0 && boundaries.has(char)) return index;
  }
  return value.length;
}

function findClosingBrace(value: string, start: number) {
  let depth = 1;
  let quote = "";
  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (value.startsWith("/*", index)) {
      const end = value.indexOf("*/", index + 2);
      index = end === -1 ? value.length : end + 1;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("Unclosed CSS block");
}

function parseNodes(value: string): CssNode[] {
  const nodes: CssNode[] = [];
  let index = 0;
  while (index < value.length) {
    index = skipTrivia(value, index);
    if (index >= value.length) break;
    const boundary = findBoundary(value, index, new Set(["{", ";"]));
    const prelude = normalize(value.slice(index, boundary));
    if (!prelude) break;
    if (value[boundary] === ";") {
      nodes.push({ prelude: `${prelude};`, body: null });
      index = boundary + 1;
      continue;
    }
    if (value[boundary] !== "{") throw new Error(`Missing block after ${prelude}`);
    const closing = findClosingBrace(value, boundary + 1);
    nodes.push({ prelude, body: value.slice(boundary + 1, closing) });
    index = closing + 1;
  }
  return nodes;
}

function stripComments(value: string) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function declarations(body: string) {
  const source = stripComments(body);
  const result: Record<string, string> = {};
  let start = 0;
  while (start < source.length) {
    const end = findBoundary(source, start, new Set([";"]));
    const declaration = source.slice(start, end).trim();
    if (declaration) {
      const colon = findBoundary(declaration, 0, new Set([":"]));
      if (colon === declaration.length) {
        throw new Error(`Invalid declaration: ${declaration}`);
      }
      result[normalize(declaration.slice(0, colon))] = normalize(
        declaration.slice(colon + 1),
      );
    }
    start = end + 1;
  }
  return result;
}

function ruleMap(nodes: CssNode[], context: string[] = []) {
  const result: Record<string, Record<string, string>> = {};
  for (const node of nodes) {
    if (node.body === null) continue;
    if (node.prelude.startsWith("@media") || node.prelude.startsWith("@supports")) {
      Object.assign(result, ruleMap(parseNodes(node.body), [...context, node.prelude]));
      continue;
    }
    if (node.prelude.startsWith("@keyframes")) continue;
    const key = [...context, node.prelude].join(" | ");
    if (result[key]) throw new Error(`Duplicate contract rule: ${key}`);
    result[key] = declarations(node.body);
  }
  return result;
}

function classes(source: string) {
  return [...new Set([...source.matchAll(/\.(oc-[a-z0-9-]+)/g)].map((match) => `.${match[1]}`))].sort();
}

async function currentState(): Promise<ContractState> {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    exports: Record<string, string>;
  };
  const files: ContractSnapshot["files"] = {};
  for (const path of contractFiles) {
    files[path] = ruleMap(parseNodes(await readFile(path, "utf8")));
  }
  return {
    exports: Object.fromEntries(
      stableExports.map((specifier) => [specifier, packageJson.exports[specifier]]),
    ),
    stableClasses: classes(await readFile("styles/components.css", "utf8")),
    files,
  };
}

const baseline = JSON.parse(await readFile(manifestPath, "utf8")) as ContractSnapshot;
const current = await currentState();

for (const [specifier, target] of Object.entries(baseline.exports)) {
  if (current.exports[specifier] !== target) {
    throw new Error(`Stable export changed: ${specifier}`);
  }
}

for (const className of baseline.stableClasses) {
  if (!current.stableClasses.includes(className)) {
    throw new Error(`Stable component selector disappeared: ${className}`);
  }
}

for (const [path, rules] of Object.entries(baseline.files)) {
  const currentRules = current.files[path];
  if (!currentRules) throw new Error(`Contract file disappeared: ${path}`);
  for (const [rule, expectedDeclarations] of Object.entries(rules)) {
    const currentDeclarations = currentRules[rule];
    if (!currentDeclarations) throw new Error(`Contract rule disappeared in ${path}: ${rule}`);
    for (const [property, expectedValue] of Object.entries(expectedDeclarations)) {
      const actualValue = currentDeclarations[property];
      if (actualValue !== expectedValue) {
        throw new Error(
          `Contract declaration changed in ${path}: ${rule} { ${property}: ${expectedValue} }`,
        );
      }
    }
  }
}

console.log(`Stable ${baseline.version} contract is intact`);
