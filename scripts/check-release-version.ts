import { readFile } from "node:fs/promises";

const tag = process.argv[2];
if (!tag) {
  throw new Error("Usage: bun scripts/check-release-version.ts vX.Y.Z");
}

const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
  version?: string;
};
const expectedTag = `v${packageJson.version}`;

if (tag !== expectedTag) {
  throw new Error(`Release tag ${tag} does not match package version ${expectedTag}`);
}

console.log(`Release version matches ${tag}`);

