// Canvas shader pass for banner artwork. The crab AVIF is the one brand
// asset; variations come from restyling it — tone palettes plus dither/
// pixelate/duotone treatments — rather than from shipping more binaries.

export const bannerShaders = ["none", "dither", "pixelate", "duotone"];

// --- Crustacean artwork ------------------------------------------------
// Companions to the crab AVIF, drawn in the same dithered ember pixel
// style. Each is a coarse sprite raster (120x48 cells at 10px) built from
// shaded primitives plus per-cell jitter, so they read as siblings of the
// shipped artwork without adding binary assets.

const SPRITE_COLS = 120;
const SPRITE_ROWS = 48;
const SPRITE_CELL = 10;
const SPRITE_TONES = ["", "#5c2e26", "#c8502e", "#ffb38a"];
const SPRITE_BACKGROUND = "#0e0e10";

function createSpriteRandom(seed) {
  let bits = seed || 1;
  return () => {
    bits ^= bits << 13;
    bits ^= bits >>> 17;
    bits ^= bits << 5;
    bits >>>= 0;
    return bits;
  };
}

function createSpriteGrid() {
  return Array.from({ length: SPRITE_ROWS }, () => new Array(SPRITE_COLS).fill(0));
}

function spriteSet(grid, x, y, tone) {
  const column = Math.round(x);
  const row = Math.round(y);
  if (column < 0 || column >= SPRITE_COLS || row < 0 || row >= SPRITE_ROWS) return;
  grid[row][column] = tone;
}

// Filled ellipse with radial shading: bright core, mid body, dark rim.
function spriteEllipse(grid, cx, cy, rx, ry, { flat = 0 } = {}) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const distance = Math.sqrt(nx * nx + ny * ny);
      if (distance > 1) continue;
      const tone = flat || (distance < 0.45 ? 3 : distance < 0.82 ? 2 : 1);
      spriteSet(grid, x, y, tone);
    }
  }
}

function spriteLine(grid, x0, y0, x1, y1, tone, width = 1) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2;
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let dy = 0; dy < width; dy += 1) {
      spriteSet(grid, x, y + dy, tone);
    }
  }
}

function spriteUrl(grid, seed) {
  const next = createSpriteRandom(seed);
  const rects = [];
  for (let y = 0; y < SPRITE_ROWS; y += 1) {
    for (let x = 0; x < SPRITE_COLS; x += 1) {
      let tone = grid[y][x];
      if (!tone) continue;
      // Dither texture: occasional one-step tone jitter, like the crab art.
      if (next() % 100 < 16) tone = Math.max(1, Math.min(3, tone + (next() % 2 ? 1 : -1)));
      rects.push(
        `<rect x="${x * SPRITE_CELL}" y="${y * SPRITE_CELL}" width="${SPRITE_CELL}" height="${SPRITE_CELL}" fill="${SPRITE_TONES[tone]}"/>`,
      );
    }
  }
  const width = SPRITE_COLS * SPRITE_CELL;
  const height = SPRITE_ROWS * SPRITE_CELL;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><rect width="${width}" height="${height}" fill="${SPRITE_BACKGROUND}"/>${rects.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function lobsterArtwork() {
  const grid = createSpriteGrid();
  const cy = 24;
  // Tail fan, then segments narrowing toward it, so overlaps shade naturally.
  spriteEllipse(grid, 96, cy - 5, 5, 3);
  spriteEllipse(grid, 97, cy, 6, 3);
  spriteEllipse(grid, 96, cy + 5, 5, 3);
  for (let segment = 0; segment < 6; segment += 1) {
    const x = 62 + segment * 6;
    spriteEllipse(grid, x, cy, 6, 9 - segment);
  }
  // Carapace and head.
  spriteEllipse(grid, 46, cy, 14, 10);
  spriteEllipse(grid, 33, cy, 7, 6);
  // Claw arms and big pincers, mirrored above/below the centerline.
  for (const side of [-1, 1]) {
    spriteLine(grid, 32, cy + side * 4, 22, cy + side * 11, 2, 2);
    spriteEllipse(grid, 15, cy + side * 13, 8, 4.5);
    spriteEllipse(grid, 8, cy + side * 15, 3, 1.5, { flat: 2 });
    // Walking legs sweep back from the carapace.
    for (let leg = 0; leg < 4; leg += 1) {
      const x = 40 + leg * 5;
      spriteLine(grid, x, cy + side * 8, x + 4, cy + side * 16, 1);
    }
    // Antennae arc forward past the claws.
    spriteLine(grid, 28, cy + side * 2, 2, cy + side * 8, 1);
  }
  // Eyes.
  spriteSet(grid, 29, cy - 3, 1);
  spriteSet(grid, 29, cy + 3, 1);
  return spriteUrl(grid, 0xc7a5_0001);
}

function shrimpArtwork() {
  const grid = createSpriteGrid();
  const cx = 60;
  const cy = 21;
  // Iconic curl: overlapping segments along an arc; everything else hangs
  // off computed arc positions so the body always stays connected.
  const steps = 14;
  const position = (step) => {
    const angle = (-0.3 + (step / steps) * 1.4) * Math.PI;
    return {
      x: cx + Math.cos(angle) * 26,
      y: cy + Math.sin(angle) * 16,
    };
  };
  for (let step = steps; step >= 0; step -= 1) {
    const { x, y } = position(step);
    spriteEllipse(grid, x, y, 9.5 - step * 0.38, 7.5 - step * 0.3);
  }
  // Tail fan attached at the arc's end, spread along the travel direction.
  const tail = position(steps);
  const beyond = position(steps + 2);
  spriteEllipse(grid, beyond.x, beyond.y - 2, 5, 2.5, { flat: 2 });
  spriteEllipse(grid, beyond.x - 2, beyond.y + 2, 5, 2.5, { flat: 2 });
  spriteLine(grid, tail.x, tail.y, beyond.x, beyond.y, 2, 2);
  // Head details: eyes plus long antennae sweeping away from the curl.
  const head = position(0);
  spriteSet(grid, head.x - 2, head.y - 5, 1);
  spriteSet(grid, head.x - 1, head.y - 5, 1);
  spriteLine(grid, head.x + 4, head.y - 3, head.x + 32, head.y + 4, 1);
  spriteLine(grid, head.x + 4, head.y - 1, head.x + 28, head.y + 14, 1);
  // Swimmerets trail off the outer edge of the mid segments.
  for (let step = 3; step <= 8; step += 1) {
    const { x, y } = position(step);
    const dx = x - cx;
    const dy = y - cy;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    spriteLine(grid, x + (dx / length) * 7, y + (dy / length) * 6, x + (dx / length) * 12, y + (dy / length) * 10, 1);
  }
  return spriteUrl(grid, 0xc7a5_0002);
}

function hermitArtwork() {
  const grid = createSpriteGrid();
  const cx = 66;
  const cy = 22;
  // Spiral shell: offset rings tighten toward the whorl.
  spriteEllipse(grid, cx, cy, 20, 15);
  spriteEllipse(grid, cx + 4, cy - 2, 13, 10, { flat: 2 });
  spriteEllipse(grid, cx + 8, cy - 4, 7, 5.5, { flat: 3 });
  spriteEllipse(grid, cx + 10, cy - 5, 3, 2.5, { flat: 1 });
  // Body emerging from the aperture on the left.
  spriteEllipse(grid, 41, cy + 8, 8, 5);
  // Eye stalks with bright tips.
  spriteLine(grid, 38, cy + 4, 34, cy - 6, 1);
  spriteLine(grid, 42, cy + 4, 41, cy - 5, 1);
  spriteEllipse(grid, 33, cy - 8, 1.5, 1.5, { flat: 3 });
  spriteEllipse(grid, 41, cy - 7, 1.5, 1.5, { flat: 3 });
  // One oversized guard claw plus walking legs.
  spriteEllipse(grid, 30, cy + 14, 7, 4);
  spriteEllipse(grid, 24, cy + 16, 3, 1.5, { flat: 2 });
  for (let leg = 0; leg < 3; leg += 1) {
    const x = 44 + leg * 6;
    spriteLine(grid, x, cy + 11, x + 3, cy + 20, 1);
  }
  return spriteUrl(grid, 0xc7a5_0003);
}

const crustaceanGenerators = {
  lobster: lobsterArtwork,
  shrimp: shrimpArtwork,
  hermit: hermitArtwork,
};

const crustaceanCache = new Map();

export function crustaceanArtworkUrl(kind) {
  if (!crustaceanCache.has(kind)) {
    const generator = crustaceanGenerators[kind];
    if (!generator) return "";
    crustaceanCache.set(kind, generator());
  }
  return crustaceanCache.get(kind);
}

// Four-step palettes, darkest first. Ember matches the shipped crab art;
// the others recolor the same artwork into sibling brand moods.
export const bannerTones = {
  ember: [
    [14, 14, 16],
    [92, 46, 38],
    [200, 80, 46],
    [255, 179, 138],
  ],
  ocean: [
    [12, 16, 18],
    [24, 72, 80],
    [52, 160, 150],
    [178, 240, 224],
  ],
  violet: [
    [15, 13, 20],
    [70, 44, 110],
    [150, 90, 220],
    [230, 190, 255],
  ],
  ink: [
    [12, 12, 14],
    [70, 72, 78],
    [150, 153, 160],
    [235, 236, 240],
  ],
};

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function luminance(data, index) {
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
}

function shadePixels(pixels, width, shader, palette) {
  const { data } = pixels;
  const dark = palette[0];
  const light = palette[palette.length - 1];
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const level = luminance(data, index) / 255;
      if (shader === "dither") {
        const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5;
        const step = Math.min(
          palette.length - 1,
          Math.max(0, Math.round(level * (palette.length - 1) + threshold)),
        );
        const [r, g, b] = palette[step];
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
      } else if (shader === "duotone") {
        for (let channel = 0; channel < 3; channel += 1) {
          data[index + channel] = Math.round(
            dark[channel] + (light[channel] - dark[channel]) * level,
          );
        }
      }
    }
  }
  return pixels;
}

// Restyles any same-origin image element in place. Reads the original source
// once (kept in dataset.shaderSource) so switching shaders never compounds.
export function applyBannerShader(
  image,
  shader = "none",
  { tone = "ember", pixelSize = 5 } = {},
) {
  if (!image) return;
  const source = image.dataset.shaderSource || image.currentSrc || image.src;
  if (!source) return;
  image.dataset.shaderSource = source;
  if (shader === "none" || !bannerShaders.includes(shader)) {
    if (image.src !== source) image.src = source;
    return;
  }
  const palette = bannerTones[tone] ?? bannerTones.ember;
  const raw = new Image();
  raw.decoding = "async";
  raw.onload = () => {
    const width = Math.max(8, Math.round(raw.naturalWidth / pixelSize));
    const height = Math.max(8, Math.round(raw.naturalHeight / pixelSize));
    const small = document.createElement("canvas");
    small.width = width;
    small.height = height;
    const smallContext = small.getContext("2d", { willReadFrequently: true });
    smallContext.drawImage(raw, 0, 0, width, height);
    if (shader !== "pixelate") {
      smallContext.putImageData(
        shadePixels(smallContext.getImageData(0, 0, width, height), width, shader, palette),
        0,
        0,
      );
    }
    const out = document.createElement("canvas");
    out.width = raw.naturalWidth;
    out.height = raw.naturalHeight;
    const outContext = out.getContext("2d");
    outContext.imageSmoothingEnabled = false;
    outContext.drawImage(small, 0, 0, out.width, out.height);
    image.src = out.toDataURL("image/png");
  };
  raw.src = source;
}
