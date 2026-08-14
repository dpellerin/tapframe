import sharp from "sharp";

/** Official Spectra 6 device codes. 0x4 is unused. */
const COLOR_CODES = [0x0, 0x1, 0x2, 0x3, 0x5, 0x6] as const;

const PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [255, 255, 255],
  [255, 255, 0],
  [255, 0, 0],
  [0, 0, 255],
  [0, 255, 0],
];

const PALETTE_LUMA = PALETTE.map(
  ([r, g, b]) => (r * 250 + g * 350 + b * 400) / (255 * 1000),
);

export const EL133 = {
  id: "133",
  width: 1200,
  height: 1600,
  binSize: 960_000,
} as const;

export const EL315 = {
  id: "315",
  width: 1440,
  height: 2560,
  binSize: 2_304_000,
} as const;

export type FraimicPanel = typeof EL133 | typeof EL315;

export function panelForSource(
  width: number,
  height: number,
): FraimicPanel {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (short === EL315.width && long === EL315.height) {
    return EL315;
  }
  return EL133;
}

function lumaOf(r: number, g: number, b: number): number {
  return (r * 250 + g * 350 + b * 400) / (255 * 1000);
}

export function closestPaletteIndex(r: number, g: number, b: number): number {
  const luma = lumaOf(r, g, b);
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i];
    const dR = r - pr;
    const dG = g - pg;
    const dB = b - pb;
    const rgbDist =
      (dR * dR * 0.25 + dG * dG * 0.35 + dB * dB * 0.4) * 0.75 / (255 * 255);
    const lumaDiff = luma - PALETTE_LUMA[i];
    const dist = 1.5 * rgbDist + 0.6 * lumaDiff * lumaDiff;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Neutrals (paper, ink, rules) snap to white or black.
 * Saturated logo ink still uses the six Spectra colors.
 */
export function deviceColorIndex(r: number, g: number, b: number): number {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (chroma < 48) {
    return lumaOf(r, g, b) >= 0.55 ? 1 : 0;
  }
  return closestPaletteIndex(r, g, b);
}

export function quantizeToDeviceCodes(
  rgb: Uint8Array,
  pixelCount: number,
): Uint8Array {
  const codes = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    codes[i] = COLOR_CODES[deviceColorIndex(rgb[o], rgb[o + 1], rgb[o + 2])];
  }
  return codes;
}

/** 90° clockwise — Fraimic's landscape hanging hole is this side. */
export function rotateCw90(
  rgb: Uint8Array,
  width: number,
  height: number,
): { data: Uint8Array; width: number; height: number } {
  const outW = height;
  const outH = width;
  const out = new Uint8Array(outW * outH * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = height - 1 - y;
      const ny = x;
      const si = (y * width + x) * 3;
      const di = (ny * outW + nx) * 3;
      out[di] = rgb[si];
      out[di + 1] = rgb[si + 1];
      out[di + 2] = rgb[si + 2];
    }
  }
  return { data: out, width: outW, height: outH };
}

export function packEl133(codes: Uint8Array): Buffer {
  const { width, height, binSize } = EL133;
  if (codes.length !== width * height) {
    throw new Error(`EL133 expects ${width * height} pixels.`);
  }
  const halfCols = width / 2;
  const halfSize = binSize / 2;
  const out = Buffer.alloc(binSize);
  let left = 0;
  let right = halfSize;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < halfCols; x += 2) {
      out[left++] = (codes[row + x] << 4) | codes[row + x + 1];
    }
    for (let x = halfCols; x < width; x += 2) {
      out[right++] = (codes[row + x] << 4) | codes[row + x + 1];
    }
  }
  return out;
}

export function packEl315(codes: Uint8Array): Buffer {
  const { width, height, binSize } = EL315;
  if (codes.length !== width * height) {
    throw new Error(`EL315 expects ${width * height} pixels.`);
  }

  const flipped = new Uint8Array(codes.length);
  for (let y = 0; y < height; y++) {
    flipped.set(
      codes.subarray((height - 1 - y) * width, (height - y) * width),
      y * width,
    );
  }

  const out = Buffer.alloc(binSize);
  let offset = 0;
  for (let half = 0; half < 2; half++) {
    const stripStart = half * 1280;
    for (let ic = 0; ic < 4; ic++) {
      const realPixels = ic === 3 ? 160 : 800;
      const start = ic * 800;
      for (let b = 0; b < 720; b++) {
        out.fill(0x11, offset, offset + 400);
        for (let p = 0; p < realPixels; p += 2) {
          const q0 = start + p;
          const q1 = start + p + 1;
          const c0 =
            flipped[(stripStart + Math.floor(q0 / 2)) * width + (b * 2 + (q0 % 2))];
          const c1 =
            flipped[(stripStart + Math.floor(q1 / 2)) * width + (b * 2 + (q1 % 2))];
          out[offset + p / 2] = (c0 << 4) | c1;
        }
        offset += 400;
      }
    }
  }
  return out;
}

async function fitToPanel(
  rgb: Uint8Array,
  width: number,
  height: number,
  panel: FraimicPanel,
): Promise<Uint8Array> {
  if (width === panel.width && height === panel.height) {
    return rgb;
  }
  const fitted = await sharp(rgb, {
    raw: { width, height, channels: 3 },
  })
    .resize(panel.width, panel.height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
    })
    .raw()
    .toBuffer();
  return fitted;
}

export async function pngToFraimicBin(
  png: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<Buffer> {
  const panel = panelForSource(sourceWidth, sourceHeight);
  const decoded = await sharp(png).removeAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  let rgb: Uint8Array = decoded.data;
  let width = decoded.info.width;
  let height = decoded.info.height;

  if (width > height) {
    const rotated = rotateCw90(rgb, width, height);
    rgb = rotated.data;
    width = rotated.width;
    height = rotated.height;
  }

  rgb = await fitToPanel(rgb, width, height, panel);
  const codes = quantizeToDeviceCodes(rgb, panel.width * panel.height);
  const packed = panel.id === "315" ? packEl315(codes) : packEl133(codes);
  if (packed.length !== panel.binSize) {
    throw new Error(
      `Fraimic .bin must be ${panel.binSize} bytes, got ${packed.length}.`,
    );
  }
  return packed;
}
