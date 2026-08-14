import { DEFAULT_DISPLAY, type DisplaySettings } from "./types";

export function parseDisplaySettings(value: unknown): DisplaySettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ...DEFAULT_DISPLAY, fields: { ...DEFAULT_DISPLAY.fields } };
  }

  const raw = value as Record<string, unknown>;
  const adapter =
    typeof raw.adapter === "string" && raw.adapter.trim()
      ? raw.adapter.trim()
      : DEFAULT_DISPLAY.adapter;
  const size =
    typeof raw.size === "string" && raw.size.trim()
      ? raw.size.trim()
      : DEFAULT_DISPLAY.size;

  const fields: Record<string, string> = { ...DEFAULT_DISPLAY.fields };
  if (typeof raw.fields === "object" && raw.fields !== null && !Array.isArray(raw.fields)) {
    for (const [key, item] of Object.entries(raw.fields)) {
      if (typeof item === "string") {
        fields[key] = item.trim();
      }
    }
  } else if (typeof raw.host === "string") {
    fields.host = raw.host.trim();
  }

  return { adapter, size, fields };
}
