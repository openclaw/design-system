const avatarPalettes = [
  ["#1b1b20", "#ff5c46", "#ffd166", "#8be28b"],
  ["#15161a", "#6d7cff", "#ff7ac6", "#a8f0e0"],
  ["#1a1715", "#ff8f3d", "#f9dc5c", "#5ed0c7"],
  ["#17151d", "#a978ff", "#ff6b8a", "#7ee787"],
];

function hashAvatarSeed(seed) {
  let hash = 2166136261;
  for (const character of seed) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

export function avatarFixtureUrl(seed) {
  const hash = hashAvatarSeed(seed);
  const palette = avatarPalettes[hash % avatarPalettes.length];
  const skin = ["#f5c7a9", "#d99b75", "#9f6547", "#6f4433"][(hash >>> 3) % 4];
  const hair = palette[1 + ((hash >>> 7) % 3)];
  const shirt = palette[1 + ((hash >>> 11) % 3)];
  const eyeOffset = (hash >>> 15) % 2;
  const fringe = (hash >>> 17) % 3;
  const accessory =
    hash & 1
      ? `<rect x="4" y="17" width="7" height="2" fill="${palette[2]}"/><rect x="29" y="17" width="7" height="2" fill="${palette[2]}"/>`
      : `<rect x="6" y="8" width="5" height="4" fill="${palette[3]}"/><rect x="29" y="8" width="5" height="4" fill="${palette[3]}"/>`;
  const hairPixels = [
    `<rect x="8" y="5" width="24" height="5" fill="${hair}"/>`,
    `<rect x="5" y="9" width="30" height="5" fill="${hair}"/>`,
    fringe === 0 ? `<rect x="8" y="13" width="8" height="5" fill="${hair}"/>` : "",
    fringe === 1 ? `<rect x="24" y="13" width="8" height="5" fill="${hair}"/>` : "",
    fringe === 2 ? `<rect x="16" y="13" width="8" height="4" fill="${hair}"/>` : "",
  ].join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" shape-rendering="crispEdges"><rect width="40" height="40" fill="${palette[0]}"/><rect x="4" y="4" width="32" height="32" rx="6" fill="${palette[3]}" opacity=".18"/>${accessory}<rect x="8" y="10" width="24" height="23" fill="${skin}"/>${hairPixels}<rect x="${12 + eyeOffset}" y="19" width="4" height="4" fill="#19191d"/><rect x="${24 - eyeOffset}" y="19" width="4" height="4" fill="#19191d"/><rect x="17" y="26" width="6" height="2" fill="#7d3f4c"/><rect x="5" y="33" width="30" height="7" fill="${shirt}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
