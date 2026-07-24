// Canvas shader pass for banner artwork. Sibling crustacean images are an
// asset-pipeline concern (generate them with an image model from the crab
// artwork, pre-dither, ship as AVIF); this module keeps any such asset
// on-brand at runtime via tone palettes and dither/pixelate/duotone passes.

export const bannerShaders = ["none", "dither", "pixelate", "duotone"];

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
