import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { defaultDataDir } from "../tap-store";
import { parseDisplaySettings } from "./settings";
import type { DisplaySettings } from "./types";

export function createDisplayStore(dataDir: string) {
  const file = path.join(dataDir, "display.yaml");

  return {
    async load(): Promise<DisplaySettings> {
      let text: string;
      try {
        text = await readFile(file, "utf8");
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
      const next = parseDisplaySettings(settings);
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        file,
        stringifyYaml(
          {
            adapter: next.adapter,
            size: next.size,
            fields: next.fields,
          },
          { lineWidth: 0 },
        ),
        "utf8",
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

export const defaultDisplayStore = createDisplayStore(defaultDataDir());
