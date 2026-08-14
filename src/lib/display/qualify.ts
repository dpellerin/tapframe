import type { DisplayAdapter, DisplayManifest } from "./types";

export function qualifyAdapter(value: unknown): DisplayAdapter | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Partial<DisplayAdapter>;
  if (typeof candidate.send !== "function") {
    return null;
  }
  if (!qualifyManifest(candidate.manifest)) {
    return null;
  }
  return candidate as DisplayAdapter;
}

function qualifyManifest(value: unknown): value is DisplayManifest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const manifest = value as Partial<DisplayManifest>;
  if (!isName(manifest.id) || !isName(manifest.name)) {
    return false;
  }
  if (!Array.isArray(manifest.sizes) || manifest.sizes.length === 0) {
    return false;
  }
  if (
    !manifest.sizes.every(
      (size) =>
        isName(size?.id) &&
        isName(size?.label) &&
        isPixel(size?.width) &&
        isPixel(size?.height),
    )
  ) {
    return false;
  }
  const layout = manifest.layout;
  if (
    !layout ||
    !isCount(layout.maxPerRow) ||
    !isCount(layout.rows)
  ) {
    return false;
  }
  if (!Array.isArray(manifest.fields)) {
    return false;
  }
  return manifest.fields.every(
    (field) =>
      isName(field?.key) &&
      isName(field?.label) &&
      (field.type === "text" || field.type === "password"),
  );
}

function isName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPixel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 200;
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}
