import "server-only";

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { atomicWriteFile } from "../atomic-write";
import { resolveDataDir } from "../data-dir";
import { parseDisplaySettings } from "./settings";
import type { DisplaySettings } from "./types";

export function createDisplayStore(dataDir: string | (() => string)) {
  const paths = () => {
    const resolved = typeof dataDir === "function" ? dataDir() : dataDir;
    return { dataDir: resolved, file: path.join(resolved, "display.yaml") };
  };

  return {
    async load(): Promise<DisplaySettings> {
      const { file } = paths();
      let text: string;
      try {
        text = await readFile(/* turbopackIgnore: true */ file, "utf8");
      } catch (error) {
        if (isNotFound(error)) {
          return parseDisplaySettings(null);
        }
        throw error;
      }
      if (text.trim() === "") {
        return parseDisplaySettings(null);
      }
      try {
        return parseDisplaySettings(parseYaml(text));
      } catch {
        throw new Error("Could not read display.yaml.");
      }
    },

    async save(settings: DisplaySettings): Promise<void> {
      const { dataDir, file } = paths();
      const next = parseDisplaySettings(settings);
      await mkdir(dataDir, { recursive: true });
      await atomicWriteFile(
        file,
        stringifyYaml(
          {
            adapter: next.adapter,
            size: next.size,
            fields: next.fields,
          },
          { lineWidth: 0 },
        ),
      );
    },
  };
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}

export const defaultDisplayStore = createDisplayStore(resolveDataDir);
