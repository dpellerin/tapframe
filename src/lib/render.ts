import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  DEFAULT_BOARD_LAYOUT,
  boardCapacity,
} from "./display/layout";
import type { BoardLayout } from "./display/types";
import { rendererFontFiles } from "./renderer-assets";
import type { Tap } from "./taps";

export type MenuCanvas = {
  width: number;
  height: number;
};

export type RenderMenuOptions = MenuCanvas & {
  taps: Tap[];
  title?: string;
  subtitle?: string;
  layout?: BoardLayout;
  readLogo?: (storedPath: string) => Promise<Buffer | null>;
};

const PAPER = "#f7f4ee";
const INK = "#1c1a17";
const MUTED = "#322f2b";
const RULE = "#d4cfc4";
const SERIF = "Source Serif 4";
const SANS = "Source Sans 3";

const FONT_FILES = rendererFontFiles();

export function parseCanvas(
  width: unknown,
  height: unknown,
): MenuCanvas | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 200 ||
    height < 200 ||
    width > 4000 ||
    height > 4000
  ) {
    return null;
  }
  return { width, height };
}

export async function renderMenuPng(options: RenderMenuOptions): Promise<Buffer> {
  const svg = await buildMenuSvg(options);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: options.width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: SANS,
    },
    background: PAPER,
  });
  return Buffer.from(resvg.render().asPng());
}

export async function buildMenuSvg(options: RenderMenuOptions): Promise<string> {
  const { width, height } = options;
  const layout = options.layout ?? DEFAULT_BOARD_LAYOUT;
  const taps = options.taps.slice(0, boardCapacity(layout));
  const title = options.title?.trim() ?? "";
  const subtitle = title ? options.subtitle?.trim() ?? "" : "";
  const logos = await Promise.all(
    taps.map(async (tap) => {
      if (!tap.logo || !options.readLogo) {
        return null;
      }
      const bytes = await options.readLogo(tap.logo);
      if (!bytes) {
        return null;
      }
      return embedLogo(bytes);
    }),
  );

  const margin = Math.round(Math.min(width, height) * 0.035);
  const titleSize = title
    ? clamp(Math.round(height * 0.12), 36, 92)
    : 0;
  const subtitleSize = subtitle
    ? clamp(Math.round(titleSize * 0.48), 20, 42)
    : 0;
  const headerPadTop = title ? Math.round(height * 0.05) : margin;
  const headerPadBottom = title ? Math.round(height * 0.05) : 0;
  const subtitleGap = subtitle ? Math.round(titleSize * 0.5) : 0;
  const headerBottom = title
    ? headerPadTop + titleSize + subtitleGap + subtitleSize + headerPadBottom
    : margin;
  const columns = Math.min(Math.max(taps.length, 1), layout.maxPerRow);
  const gap = columns > 1 ? Math.round(width * 0.016) : 0;
  const rowGap = taps.length > columns ? Math.round(height * 0.03) : 0;
  const innerWidth = width - margin * 2;
  const cardWidth = Math.floor((innerWidth - gap * (columns - 1)) / columns);
  const originY = headerBottom;
  const availableHeight = height - originY - margin;

  const header = title
    ? headerSvg({
        title,
        subtitle,
        width,
        height,
        margin,
        titleSize,
        subtitleSize,
        headerPadTop,
        headerBottom,
        subtitleGap,
      })
    : "";

  const rowCount = Math.max(1, Math.ceil(taps.length / columns));
  const rowHeight = Math.floor(
    (availableHeight - rowGap * (rowCount - 1)) / rowCount,
  );
  const layouts = taps.map((tap) => cardLayout(tap, cardWidth, rowHeight));
  const rowHeights = Array.from({ length: rowCount }, (_, row) => {
    const start = row * columns;
    return layouts
      .slice(start, start + columns)
      .reduce((max, layout) => Math.max(max, layout.contentHeight), 0);
  });
  const blockHeight =
    rowHeights.reduce((sum, row) => sum + row, 0) + rowGap * (rowCount - 1);
  const blockStart =
    originY + Math.max(0, Math.round((availableHeight - blockHeight) / 2));

  const cards =
    taps.length === 0
      ? emptyBoard(margin, originY, innerWidth, availableHeight)
      : taps
          .map((tap, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = margin + col * (cardWidth + gap);
            const startY =
              blockStart +
              rowHeights.slice(0, row).reduce((sum, rowH) => sum + rowH, 0) +
              row * rowGap;
            return cardSvg({
              tap,
              layout: layouts[index]!,
              logoHref: logos[index] ?? null,
              x,
              startY,
              width: cardWidth,
              groupHeight: rowHeights[row] ?? 0,
              showRule: col < columns - 1 && index < taps.length - 1,
              gap,
            });
          })
          .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PAPER}"/>
  ${header}
  ${cards}
</svg>`;
}

function headerSvg(options: {
  title: string;
  subtitle: string;
  width: number;
  height: number;
  margin: number;
  titleSize: number;
  subtitleSize: number;
  headerPadTop: number;
  headerBottom: number;
  subtitleGap: number;
}): string {
  const {
    title,
    subtitle,
    width,
    height,
    margin,
    titleSize,
    subtitleSize,
    headerPadTop,
    headerBottom,
    subtitleGap,
  } = options;
  const titleY = headerPadTop + titleSize * 0.82;
  const titleWidth = title.length * titleSize * 0.52;
  const sideRoom = (width - titleWidth) / 2;
  const ruleLen = titleSize * 1.15;
  const ruleGap = titleSize * 0.4;
  const ruleY = headerPadTop + titleSize * 0.42;
  const marks =
    sideRoom > ruleLen + ruleGap + margin
      ? `<line x1="${width / 2 - titleWidth / 2 - ruleGap - ruleLen}" y1="${ruleY}" x2="${width / 2 - titleWidth / 2 - ruleGap}" y2="${ruleY}" stroke="${RULE}" stroke-width="1.25" stroke-linecap="round"/>
  <line x1="${width / 2 + titleWidth / 2 + ruleGap}" y1="${ruleY}" x2="${width / 2 + titleWidth / 2 + ruleGap + ruleLen}" y2="${ruleY}" stroke="${RULE}" stroke-width="1.25" stroke-linecap="round"/>`
      : "";
  const kicker = subtitle
    ? `<text x="${width / 2}" y="${titleY + subtitleGap + subtitleSize * 0.75}" text-anchor="middle" font-family="${SANS}" font-size="${subtitleSize}" fill="${MUTED}">${escapeXml(subtitle)}</text>`
    : "";

  return `
  ${marks}
  <text x="${width / 2}" y="${titleY}" text-anchor="middle" font-family="${SERIF}" font-weight="600" font-size="${titleSize}" fill="${INK}">${escapeXml(title)}</text>
  ${kicker}
  <line x1="${margin}" y1="${headerBottom - Math.round(height * 0.016)}" x2="${width - margin}" y2="${headerBottom - Math.round(height * 0.016)}" stroke="${RULE}" stroke-width="1"/>`;
}

function emptyBoard(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return `<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" font-family="${SANS}" font-size="${Math.round(Math.min(width, height) * 0.045)}" fill="${MUTED}">Nothing on tap</text>`;
}

type CardLayout = {
  logoSize: number;
  nameSize: number;
  styleSize: number;
  abvSize: number;
  gapLogo: number;
  gapMeta: number;
  gapDesc: number;
  nameLines: string[];
  fittedDesc: { size: number; lines: string[] };
  contentHeight: number;
};

function cardLayout(tap: Tap, width: number, height: number): CardLayout {
  const pad = Math.round(width * 0.06);
  const contentWidth = width - pad * 2;
  const logoSize = Math.round(Math.min(width * 0.48, height * 0.3));
  const nameSize = clamp(Math.round(Math.min(width * 0.168, height * 0.13)), 22, 68);
  const metaSize = clamp(Math.round(width * 0.11), 18, 36);
  const styleSize = clamp(Math.round(metaSize * 0.96), 18, 34);
  const abvSize = clamp(Math.round(metaSize * 1.08), 19, 38);
  const descSize = clamp(Math.round(width * 0.1), 17, 34);
  const gapLogo = Math.round(height * 0.035);
  const gapMeta = Math.round(Math.max(8, height * 0.022));
  const gapDesc = Math.round(height * 0.026);

  const nameLines = wrapText(tap.name, contentWidth, nameSize, 0.52, 2);
  const nameBlock = nameLines.length * nameSize * 1.15;
  const fittedDesc = fitWrappedText({
    text: tap.description,
    maxWidth: contentWidth,
    preferredSize: descSize,
    minSize: 16,
    lineHeight: 1.32,
    maxHeight: Math.round(height * 0.3),
    avg: 0.5,
  });
  const descBlock =
    fittedDesc.lines.length > 0
      ? fittedDesc.lines.length * fittedDesc.size * 1.35
      : 0;

  return {
    logoSize,
    nameSize,
    styleSize,
    abvSize,
    gapLogo,
    gapMeta,
    gapDesc,
    nameLines,
    fittedDesc,
    contentHeight:
      logoSize +
      gapLogo +
      nameBlock +
      gapMeta +
      abvSize +
      (descBlock > 0 ? gapDesc + descBlock : 0),
  };
}

function cardSvg(options: {
  tap: Tap;
  layout: CardLayout;
  logoHref: string | null;
  x: number;
  startY: number;
  width: number;
  groupHeight: number;
  showRule: boolean;
  gap: number;
}): string {
  const { tap, layout, logoHref, x, startY, width, groupHeight, showRule, gap } =
    options;
  const {
    logoSize,
    nameSize,
    styleSize,
    abvSize,
    gapLogo,
    gapMeta,
    gapDesc,
    nameLines,
    fittedDesc,
  } = layout;

  const logoX = x + (width - logoSize) / 2;
  const logoY = startY;
  const nameY = logoY + logoSize + gapLogo + nameSize;
  const metaY =
    nameY + (nameLines.length - 1) * nameSize * 1.15 + gapMeta + abvSize;
  const descY = metaY + gapDesc + fittedDesc.size;

  const nameSvg = nameLines
    .map((line, i) => {
      const yy = nameY + i * nameSize * 1.15;
      return `<text x="${x + width / 2}" y="${yy}" text-anchor="middle" font-family="${SERIF}" font-weight="600" font-size="${nameSize}" fill="${INK}">${escapeXml(line)}</text>`;
    })
    .join("");

  const descSvg = fittedDesc.lines
    .map((line, i) => {
      const yy = descY + i * fittedDesc.size * 1.35;
      return `<text x="${x + width / 2}" y="${yy}" text-anchor="middle" font-family="${SANS}" font-size="${fittedDesc.size}" fill="${MUTED}">${escapeXml(line)}</text>`;
    })
    .join("");

  const ruleX = x + width + gap / 2;
  const ruleTop = startY;
  const ruleBottom = startY + groupHeight;
  const rule =
    showRule && gap > 0
      ? `<line x1="${ruleX}" y1="${ruleTop}" x2="${ruleX}" y2="${ruleBottom}" stroke="${RULE}" stroke-width="1"/>`
      : "";

  return `
  <g>
    ${logoMark(logoHref, logoX, logoY, logoSize)}
    ${nameSvg}
    ${metaPairSvg(tap, x + width / 2, metaY, styleSize, abvSize)}
    ${descSvg}
    ${rule}
  </g>`;
}

function metaPairSvg(
  tap: Tap,
  centerX: number,
  y: number,
  styleSize: number,
  abvSize: number,
): string {
  const style = tap.style.trim().toUpperCase();
  const abv = formatAbv(tap.abv);
  if (!style && !abv) {
    return "";
  }
  if (!style) {
    return `<text x="${centerX}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${abvSize}" fill="${INK}">${escapeXml(abv)}</text>`;
  }
  if (!abv) {
    return `<text x="${centerX}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${styleSize}" letter-spacing="1.2" fill="${MUTED}">${escapeXml(style)}</text>`;
  }

  const styleWidth = style.length * styleSize * 0.58;
  const abvWidth = abv.length * abvSize * 0.56;
  const pairGap = Math.max(10, styleSize * 0.85);
  const total = styleWidth + pairGap + abvWidth;
  const styleX = centerX - total / 2 + styleWidth / 2;
  const abvX = centerX + total / 2 - abvWidth / 2;
  return `<text x="${styleX}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${styleSize}" letter-spacing="1.2" fill="${MUTED}">${escapeXml(style)}</text>
    <text x="${abvX}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${abvSize}" fill="${INK}">${escapeXml(abv)}</text>`;
}

function formatAbv(abv: number): string {
  const text = Number.isInteger(abv) ? String(abv) : abv.toFixed(1);
  return `${text}%`;
}

function logoMark(
  href: string | null,
  x: number,
  y: number,
  size: number,
): string {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  if (href) {
    const clipId = `logo-${Math.round(x)}-${Math.round(y)}`;
    return `
    <defs>
      <clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#efeae1"/>
    <image href="${href}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
  }

  const glassW = size * 0.42;
  const glassH = size * 0.58;
  const gx = cx - glassW / 2;
  const gy = cy - glassH / 2 + size * 0.02;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RULE}" stroke-width="1.25"/>
    <path d="M ${gx} ${gy} h ${glassW} l ${-glassW * 0.1} ${glassH * 0.78} q ${-glassW * 0.08} ${glassH * 0.22} ${-glassW * 0.4} ${glassH * 0.22} t ${-glassW * 0.4} ${-glassH * 0.22} Z" fill="none" stroke="${INK}" stroke-width="${Math.max(1.5, size * 0.03)}" stroke-linejoin="round"/>
    <path d="M ${gx + glassW * 0.12} ${gy + glassH * 0.16} h ${glassW * 0.76}" stroke="${RULE}" stroke-width="${Math.max(1.25, size * 0.025)}" stroke-linecap="round"/>`;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  avg: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const widthOf = (value: string) => value.length * fontSize * avg;
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (widthOf(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
    }
    current = widthOf(word) > maxWidth ? truncate(word, maxWidth, fontSize, avg) : word;
    if (Number.isFinite(maxLines) && lines.length === maxLines - 1) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (Number.isFinite(maxLines) && lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      lines[maxLines - 1] = ellipsize(lines[maxLines - 1] ?? "", maxWidth, fontSize, avg);
    }
  }

  return lines;
}

function fitWrappedText(options: {
  text: string;
  maxWidth: number;
  preferredSize: number;
  minSize: number;
  lineHeight: number;
  maxHeight: number;
  avg: number;
}): { size: number; lines: string[] } {
  const text = options.text.trim();
  if (!text) {
    return { size: options.preferredSize, lines: [] };
  }

  for (let size = options.preferredSize; size >= options.minSize; size -= 1) {
    const lines = wrapText(text, options.maxWidth, size, options.avg, Number.POSITIVE_INFINITY);
    if (lines.join(" ").includes("…") && lines.join("") !== text.replaceAll(" ", "")) {
      continue;
    }
    const height = lines.length * size * options.lineHeight;
    const wordsFit = lines.join(" ") === text;
    if (height <= options.maxHeight && wordsFit) {
      return { size, lines };
    }
  }

  const size = options.minSize;
  const maxLines = Math.max(
    1,
    Math.floor(options.maxHeight / (size * options.lineHeight)),
  );
  return {
    size,
    lines: wrapText(text, options.maxWidth, size, options.avg, maxLines),
  };
}

function truncate(
  word: string,
  maxWidth: number,
  fontSize: number,
  avg: number,
): string {
  const budget = Math.max(1, Math.floor(maxWidth / (fontSize * avg)) - 1);
  return `${word.slice(0, budget)}…`;
}

function ellipsize(
  line: string,
  maxWidth: number,
  fontSize: number,
  avg: number,
): string {
  const suffix = "…";
  if (line.length * fontSize * avg <= maxWidth) {
    return `${line}${suffix}`.replace(/…{2,}$/, "…");
  }
  const budget = Math.max(1, Math.floor(maxWidth / (fontSize * avg)) - 1);
  return `${line.slice(0, budget).trimEnd()}…`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function embedLogo(bytes: Buffer): Promise<string | null> {
  try {
    if (looksLikeSvg(bytes)) {
      return `data:image/svg+xml;base64,${bytes.toString("base64")}`;
    }
    const png = await sharp(bytes)
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function looksLikeSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 200).toString("utf8").trim().toLowerCase();
  return head.startsWith("<svg") || head.startsWith("<?xml");
}
