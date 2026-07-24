const avatarPalettes = [
  ["#1b1b20", "#ff5c46", "#ffd166", "#8be28b"],
  ["#15161a", "#6d7cff", "#ff7ac6", "#a8f0e0"],
  ["#1a1715", "#ff8f3d", "#f9dc5c", "#5ed0c7"],
  ["#17151d", "#a978ff", "#ff6b8a", "#7ee787"],
  ["#15191c", "#54d2d2", "#ffcb77", "#ff6b6b"],
  ["#1b1622", "#f15bb5", "#fee440", "#00bbf9"],
  ["#171b16", "#9be564", "#f5a65b", "#5b8e7d"],
  ["#1b1717", "#ef476f", "#ffd166", "#06d6a0"],
];

export const avatarFixturePeople = [
  { name: "Mina", role: "Product" },
  { name: "Atlas", role: "Research" },
  { name: "Sora", role: "Interface" },
  { name: "Quinn", role: "Systems" },
  { name: "Planner", role: "Planning" },
  { name: "Builder", role: "Build" },
  { name: "Reviewer", role: "Review" },
  { name: "Scout", role: "Discovery" },
];

function hashAvatarSeed(seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function avatarFixtureUrl(seed) {
  // Abstract mirrored pixel mosaic: identicon-style identity with a vivid
  // multi-color palette. No faces; the seed fully determines the pattern.
  const hash = hashAvatarSeed(seed);
  const palette = avatarPalettes[hash % avatarPalettes.length];
  const cells = [];
  const size = 8;
  const half = size / 2;
  let bits = hash;
  const next = () => {
    // xorshift keeps the stream deterministic per seed
    bits ^= bits << 13;
    bits ^= bits >>> 17;
    bits ^= bits << 5;
    bits >>>= 0;
    return bits;
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const roll = next() % 100;
      if (roll < 62) {
        const color = palette[1 + (next() % 3)];
        const px = 4 + x * 4;
        const mirrored = 4 + (size - 1 - x) * 4;
        const py = 4 + y * 4;
        cells.push(`<rect x="${px}" y="${py}" width="4" height="4" fill="${color}"/>`);
        cells.push(`<rect x="${mirrored}" y="${py}" width="4" height="4" fill="${color}"/>`);
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" shape-rendering="crispEdges"><rect width="40" height="40" fill="${palette[0]}"/>${cells.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}


// Default identity: a pixel claw for agents and surfaces without their own
// avatar. Deterministic, matching the generated-people art style.
export function clawAvatarUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" shape-rendering="crispEdges"><rect width="40" height="40" fill="#17151d"/><rect x="4" y="4" width="32" height="32" rx="6" fill="#f5654a" opacity=".14"/><rect x="12" y="6" width="2" height="6" fill="#f5654a"/><rect x="26" y="6" width="2" height="6" fill="#f5654a"/><rect x="10" y="4" width="3" height="3" fill="#ffd166"/><rect x="27" y="4" width="3" height="3" fill="#ffd166"/><rect x="10" y="14" width="20" height="14" fill="#f5654a"/><rect x="8" y="16" width="2" height="8" fill="#e05540"/><rect x="30" y="16" width="2" height="8" fill="#e05540"/><rect x="14" y="18" width="4" height="4" fill="#19191d"/><rect x="22" y="18" width="4" height="4" fill="#19191d"/><rect x="15" y="19" width="1" height="1" fill="#fff"/><rect x="23" y="19" width="1" height="1" fill="#fff"/><rect x="17" y="24" width="6" height="2" fill="#b23a28"/><rect x="4" y="24" width="6" height="8" fill="#f5654a"/><rect x="30" y="24" width="6" height="8" fill="#f5654a"/><rect x="3" y="22" width="4" height="4" fill="#f5654a"/><rect x="33" y="22" width="4" height="4" fill="#f5654a"/><rect x="12" y="28" width="16" height="6" fill="#e05540"/><rect x="14" y="34" width="3" height="3" fill="#b23a28"/><rect x="23" y="34" width="3" height="3" fill="#b23a28"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Resolve an avatar for any identity: known people render their generated
// portrait, everything else falls back to the claw mark.
export function resolveAvatarUrl(name) {
  if (!name) return clawAvatarUrl();
  return avatarFixturePeople.some((person) => person.name === name)
    ? avatarFixtureUrl(name)
    : clawAvatarUrl();
}
