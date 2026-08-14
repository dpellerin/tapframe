export type PreviewSize = {
  id: string;
  width: number;
  height: number;
  label: string;
};

export const PREVIEW_SIZES: PreviewSize[] = [
  { id: "1600x1200", width: 1600, height: 1200, label: "1600 × 1200" },
];

export function previewSizeById(id: string): PreviewSize | undefined {
  return PREVIEW_SIZES.find((size) => size.id === id);
}

export const MAX_CANVAS_EDGE = 4000;

export function fitPreviewCanvas(options: {
  boxWidth: number;
  boxHeight: number;
  aspectWidth: number;
  aspectHeight: number;
  devicePixelRatio?: number;
  max?: number;
}): { width: number; height: number } {
  const dpr = options.devicePixelRatio && options.devicePixelRatio > 0 ? options.devicePixelRatio : 1;
  const aspect = options.aspectWidth / options.aspectHeight;
  const boxWidth = Math.max(1, options.boxWidth);
  const boxHeight = Math.max(1, options.boxHeight);

  let cssWidth = boxWidth;
  let cssHeight = cssWidth / aspect;
  if (cssHeight > boxHeight) {
    cssHeight = boxHeight;
    cssWidth = cssHeight * aspect;
  }

  let width = Math.round(cssWidth * dpr);
  let height = Math.round(cssHeight * dpr);

  const max = options.max ?? MAX_CANVAS_EDGE;
  const longest = Math.max(width, height);
  if (longest > max) {
    const scale = max / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const shortest = Math.min(width, height);
  if (shortest < 200) {
    const scale = 200 / shortest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height };
}
