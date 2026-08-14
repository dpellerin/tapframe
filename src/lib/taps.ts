export type Tap = {
  name: string;
  style: string;
  abv: number;
  description: string;
  logo?: string;
};

export type Menu = {
  title: string;
  subtitle: string;
  taps: Tap[];
};

export type ParseResult =
  | { ok: true; taps: Tap[] }
  | { ok: false; error: string };

export type MenuParseResult =
  | { ok: true; menu: Menu }
  | { ok: false; error: string };

export const DEFAULT_TITLE = "On tap";

const MAX_ABV = 30;
export const LOGO_PREFIX = "logos/";

export function parseTapList(value: unknown): ParseResult {
  if (value == null) {
    return { ok: false, error: "Tap list is empty." };
  }

  let rawTaps: unknown;
  if (Array.isArray(value)) {
    rawTaps = value;
  } else if (typeof value === "object" && value !== null && "taps" in value) {
    rawTaps = (value as { taps: unknown }).taps;
  } else {
    return { ok: false, error: "Expected a taps list." };
  }

  if (!Array.isArray(rawTaps)) {
    return { ok: false, error: "Expected a taps list." };
  }

  const taps: Tap[] = [];
  for (const [index, item] of rawTaps.entries()) {
    const parsed = parseTap(item, index);
    if (!parsed.ok) {
      return parsed;
    }
    taps.push(parsed.tap);
  }

  return { ok: true, taps };
}

export function parseMenu(value: unknown): MenuParseResult {
  const taps = parseTapList(value);
  if (!taps.ok) {
    return taps;
  }

  let title = DEFAULT_TITLE;
  if (value && typeof value === "object" && !Array.isArray(value) && "title" in value) {
    const raw = (value as { title: unknown }).title;
    if (typeof raw === "string") {
      title = raw.trim();
    } else if (raw != null) {
      title = String(raw).trim();
    }
  }

  let subtitle = "";
  if (value && typeof value === "object" && !Array.isArray(value) && "subtitle" in value) {
    const raw = (value as { subtitle: unknown }).subtitle;
    if (typeof raw === "string") {
      subtitle = raw.trim();
    } else if (raw != null) {
      subtitle = String(raw).trim();
    }
  }

  return { ok: true, menu: { title, subtitle, taps: taps.taps } };
}

const COUNT_WORDS = [
  "None",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
];

export function quietSubtitle(tapCount: number, now = new Date()): string {
  const when = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  if (tapCount <= 0) {
    return when;
  }
  const count = COUNT_WORDS[tapCount] ?? String(tapCount);
  return `${count} on · ${when}`;
}

function parseTap(
  value: unknown,
  index: number,
): { ok: true; tap: Tap } | { ok: false; error: string } {
  const label = `Tap ${index + 1}`;
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: `${label} is not a beer.` };
  }

  const raw = value as Record<string, unknown>;
  const name = asTrimmedString(raw.name);
  if (!name) {
    return { ok: false, error: `${label} needs a name.` };
  }

  const style = asTrimmedString(raw.style);
  const description = asTrimmedString(raw.description);
  const abv = parseAbv(raw.abv);
  if (abv == null) {
    return { ok: false, error: `${label} needs an ABV between 0 and ${MAX_ABV}.` };
  }

  const tap: Tap = { name, style, abv, description };
  const logo = parseLogo(raw.logo);
  if (logo === false) {
    return { ok: false, error: `${label} has an invalid logo path.` };
  }
  if (logo) {
    tap.logo = logo;
  }

  return { ok: true, tap };
}

function asTrimmedString(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value !== "string") {
    return String(value).trim();
  }
  return value.trim();
}

function parseAbv(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 && value <= MAX_ABV ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_ABV) {
      return parsed;
    }
  }
  return null;
}

function parseLogo(value: unknown): string | undefined | false {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const filename = logoFilename(trimmed);
  if (!filename) {
    return false;
  }
  return `${LOGO_PREFIX}${filename}`;
}

export function logoFilename(storedPath: string): string | null {
  const normalized = storedPath.trim().replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  const base = parts[parts.length - 1] ?? "";
  if (!base || base === "." || base === ".." || base.includes("\0")) {
    return null;
  }
  if (!/^[A-Za-z0-9._-]+$/.test(base)) {
    return null;
  }
  return base;
}
