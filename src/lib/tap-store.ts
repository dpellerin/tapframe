import "server-only";

import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { atomicWriteFile } from "./atomic-write";
import { resolveDataDir } from "./data-dir";
import {
  DEFAULT_TITLE,
  LOGO_PREFIX,
  logoFilename,
  parseMenu,
  type Menu,
} from "./taps";

export function createTapStore(dataDir: string | (() => string)) {
  const paths = () => {
    const resolved = typeof dataDir === "function" ? dataDir() : dataDir;
    return {
      dataDir: resolved,
      tapsFile: path.join(resolved, "taps.yaml"),
      logosDir: path.join(resolved, "logos"),
    };
  };

  return {
    async load(): Promise<Menu> {
      const { tapsFile } = paths();
      let text: string;
      try {
        text = await readFile(/* turbopackIgnore: true */ tapsFile, "utf8");
      } catch (error) {
        if (isNotFound(error)) {
          return { title: DEFAULT_TITLE, subtitle: "", taps: [] };
        }
        throw error;
      }

      if (text.trim() === "") {
        return { title: DEFAULT_TITLE, subtitle: "", taps: [] };
      }

      let parsed: unknown;
      try {
        parsed = parseYaml(text);
      } catch {
        throw new Error("Could not read taps.yaml.");
      }

      const result = parseMenu(parsed);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.menu;
    },

    async save(menu: Menu): Promise<void> {
      const { dataDir, tapsFile } = paths();
      const result = parseMenu(menu);
      if (!result.ok) {
        throw new Error(result.error);
      }

      await mkdir(dataDir, { recursive: true });
      const body = stringifyYaml(
        {
          title: result.menu.title,
          subtitle: result.menu.subtitle,
          taps: result.menu.taps.map((tap) => {
            const row: Record<string, string | number> = {
              name: tap.name,
              style: tap.style,
              abv: tap.abv,
              description: tap.description,
            };
            if (tap.logo) {
              row.logo = tap.logo;
            }
            return row;
          }),
        },
        { lineWidth: 0 },
      );
      await atomicWriteFile(tapsFile, body);
    },

    async saveLogo(originalName: string, bytes: Uint8Array): Promise<string> {
      const { logosDir } = paths();
      await mkdir(logosDir, { recursive: true });
      const ext = safeExtension(originalName);
      const filename = `${Date.now()}-${randomSuffix()}${ext}`;
      await writeFile(path.join(logosDir, filename), bytes);
      return `${LOGO_PREFIX}${filename}`;
    },

    async listLogos(): Promise<string[]> {
      const { logosDir } = paths();
      let names: string[];
      try {
        names = await readdir(/* turbopackIgnore: true */ logosDir);
      } catch (error) {
        if (isNotFound(error)) {
          return [];
        }
        throw error;
      }

      return names
        .filter((name) => {
          if (name.startsWith(".")) {
            return false;
          }
          return (
            logoFilename(name) !== null &&
            /\.(png|jpe?g|webp|svg)$/i.test(name)
          );
        })
        .sort((a, b) => a.localeCompare(b))
        .map((name) => `${LOGO_PREFIX}${name}`);
    },

    async deleteLogo(storedPath: string): Promise<boolean> {
      const { logosDir } = paths();
      const filename = logoFilename(storedPath);
      if (!filename) {
        return false;
      }
      try {
        await unlink(path.join(logosDir, filename));
        return true;
      } catch (error) {
        if (isNotFound(error)) {
          return false;
        }
        throw error;
      }
    },

    async readLogo(storedPath: string): Promise<Buffer | null> {
      const { logosDir } = paths();
      const filename = logoFilename(storedPath);
      if (!filename) {
        return null;
      }
      try {
        return await readFile(path.join(logosDir, filename));
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }
    },
  };
}

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return ".jpg";
  }
  if (ext === ".png" || ext === ".webp" || ext === ".svg") {
    return ext;
  }
  return ".png";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "ENOENT"
  );
}

export const defaultTapStore = createTapStore(resolveDataDir);
