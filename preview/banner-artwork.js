// Generated banner artwork plus a canvas shader pass. Artwork is
// deterministic SVG (same approach as avatar-fixtures) so the preview ships
// no extra binary assets; the shader can restyle ANY image — generated SVG,
// the crab AVIF, or a consumer photo — into the dithered house look.

function createSeededRandom(seed) {
  let bits = seed || 1;
  return () => {
    bits ^= bits << 13;
    bits ^= bits >>> 17;
    bits ^= bits << 5;
    bits >>>= 0;
    return bits;
  };
}

const ART_WIDTH = 1200;
const ART_HEIGHT = 480;

function svgUrl(body, background) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_WIDTH}" height="${ART_HEIGHT}" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}"><rect width="${ART_WIDTH}" height="${ART_HEIGHT}" fill="${background}"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function reefArtwork() {
  // Layered dune/coral silhouettes rising from the bottom edge.
  const next = createSeededRandom(0x5eed_0001);
  const layers = [];
  const hues = [188, 174, 160, 146];
  for (let layer = 0; layer < 4; layer += 1) {
    const base = ART_HEIGHT - 30 - layer * 78;
    const points = [`M0 ${ART_HEIGHT}`, `L0 ${base + (next() % 40)}`];
    for (let x = 0; x <= ART_WIDTH; x += 100) {
      const y = base - (next() % 90) + (next() % 40);
      points.push(`Q${x + 50} ${y - 60 + (next() % 50)} ${Math.min(x + 100, ART_WIDTH)} ${y}`);
    }
    points.push(`L${ART_WIDTH} ${ART_HEIGHT} Z`);
    const lightness = 16 + layer * 8;
    layers.unshift(
      `<path d="${points.join(" ")}" fill="hsl(${hues[layer]} 48% ${lightness}%)"/>`,
    );
  }
  const specks = [];
  for (let index = 0; index < 60; index += 1) {
    const x = next() % ART_WIDTH;
    const y = next() % Math.floor(ART_HEIGHT * 0.55);
    specks.push(
      `<rect x="${x}" y="${y}" width="3" height="3" fill="hsl(${170 + (next() % 40)} 70% ${55 + (next() % 25)}%)" opacity="0.${4 + (next() % 5)}"/>`,
    );
  }
  return svgUrl(layers.join("") + specks.join(""), "hsl(196 45% 9%)");
}

function swellArtwork() {
  // Contour swell lines with a slow hue drift down the band.
  const next = createSeededRandom(0x5eed_0002);
  const lines = [];
  for (let row = 0; row < 16; row += 1) {
    const baseY = 40 + row * 26;
    const amplitude = 10 + (next() % 22);
    const phase = next() % 200;
    const segments = [`M0 ${baseY}`];
    for (let x = 40; x <= ART_WIDTH; x += 40) {
      const y = baseY + Math.round(Math.sin((x + phase) / 90) * amplitude);
      segments.push(`L${x} ${y}`);
    }
    const hue = 12 + row * 9;
    lines.push(
      `<path d="${segments.join(" ")}" fill="none" stroke="hsl(${hue} 74% ${38 + (row % 4) * 7}%)" stroke-width="3" opacity="0.85"/>`,
    );
  }
  return svgUrl(lines.join(""), "hsl(20 30% 8%)");
}

function bloomArtwork() {
  // Pixel plankton: square particles blooming from an off-center focal point.
  const next = createSeededRandom(0x5eed_0003);
  const focalX = ART_WIDTH * 0.72;
  const focalY = ART_HEIGHT * 0.34;
  const squares = [];
  for (let index = 0; index < 300; index += 1) {
    const angle = (next() % 3600) / 10;
    const distance = ((next() % 100) / 100) ** 0.6 * 460;
    const x = Math.round(focalX + Math.cos((angle * Math.PI) / 180) * distance * 1.4);
    const y = Math.round(focalY + Math.sin((angle * Math.PI) / 180) * distance * 0.75);
    if (x < 0 || x > ART_WIDTH || y < 0 || y > ART_HEIGHT) continue;
    const size = 3 + (next() % 9);
    const hue = 258 + (next() % 70);
    const fade = Math.max(0.15, 1 - distance / 480).toFixed(2);
    squares.push(
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="hsl(${hue} 72% ${52 + (next() % 22)}%)" opacity="${fade}"/>`,
    );
  }
  return svgUrl(squares.join(""), "hsl(262 38% 9%)");
}

const artworkGenerators = {
  reef: reefArtwork,
  swell: swellArtwork,
  bloom: bloomArtwork,
};

const artworkCache = new Map();

export function bannerArtworkUrl(kind) {
  if (!artworkCache.has(kind)) {
    const generator = artworkGenerators[kind];
    if (!generator) return "";
    artworkCache.set(kind, generator());
  }
  return artworkCache.get(kind);
}

export const bannerShaders = ["none", "dither", "pixelate", "duotone"];

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Ember tones matching the dithered crab artwork, darkest first.
const DITHER_PALETTE = [
  [14, 14, 16],
  [92, 46, 38],
  [200, 80, 46],
  [255, 179, 138],
];

const DUOTONE_DARK = [16, 16, 20];
const DUOTONE_LIGHT = [255, 138, 92];

function luminance(data, index) {
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
}

function shadePixels(pixels, width, shader) {
  const { data } = pixels;
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const light = luminance(data, index) / 255;
      if (shader === "dither") {
        const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16 - 0.5;
        const level = Math.min(
          DITHER_PALETTE.length - 1,
          Math.max(0, Math.round(light * (DITHER_PALETTE.length - 1) + threshold)),
        );
        const [r, g, b] = DITHER_PALETTE[level];
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
      } else if (shader === "duotone") {
        for (let channel = 0; channel < 3; channel += 1) {
          data[index + channel] = Math.round(
            DUOTONE_DARK[channel] + (DUOTONE_LIGHT[channel] - DUOTONE_DARK[channel]) * light,
          );
        }
      }
    }
  }
  return pixels;
}

// Restyles any same-origin image element in place. Reads the original source
// once (kept in dataset.shaderSource) so switching shaders never compounds.
export function applyBannerShader(image, shader = "none", { pixelSize = 5 } = {}) {
  if (!image) return;
  const source = image.dataset.shaderSource || image.currentSrc || image.src;
  if (!source) return;
  image.dataset.shaderSource = source;
  if (shader === "none" || !bannerShaders.includes(shader)) {
    if (image.src !== source) image.src = source;
    return;
  }
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
        shadePixels(smallContext.getImageData(0, 0, width, height), width, shader),
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
