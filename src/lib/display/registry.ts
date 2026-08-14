import { loadDisplayModules } from "@/displays";
import { DEFAULT_DISPLAY, type DisplayAdapter, type DisplaySettings } from "./types";

const adapters: DisplayAdapter[] = loadDisplayModules();

export function listDisplays(): DisplayAdapter[] {
  return adapters;
}

export function getDisplay(id: string): DisplayAdapter | undefined {
  return adapters.find((adapter) => adapter.manifest.id === id);
}

export function resolveDisplay(settings: DisplaySettings): {
  adapter: DisplayAdapter;
  size: { id: string; width: number; height: number; label: string };
} {
  const adapter = getDisplay(settings.adapter) ?? getDisplay(DEFAULT_DISPLAY.adapter);
  if (!adapter) {
    throw new Error("No display modules are registered.");
  }
  const size =
    adapter.manifest.sizes.find((item) => item.id === settings.size) ??
    adapter.manifest.sizes[0];
  if (!size) {
    throw new Error(`${adapter.manifest.name} does not declare a size.`);
  }
  return { adapter, size };
}
