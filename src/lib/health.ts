import "server-only";

import { constants } from "node:fs";
import {
  access,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { resolveDataDir } from "./data-dir";
import { rendererFontFiles } from "./renderer-assets";

export type HealthResult = {
  status: "ok" | "unhealthy";
  checks: {
    data: boolean;
    fonts: boolean;
    sharp: boolean;
    resvg: boolean;
  };
};

type HealthDependencies = {
  dataDir: () => string;
  fontFiles: () => string[];
  loadSharp: () => Promise<unknown>;
  loadResvg: () => Promise<unknown>;
};

const defaultDependencies: HealthDependencies = {
  dataDir: resolveDataDir,
  fontFiles: rendererFontFiles,
  loadSharp: () => import("sharp"),
  loadResvg: () => import("@resvg/resvg-js"),
};

export async function checkHealth(
  dependencies: HealthDependencies = defaultDependencies,
): Promise<HealthResult> {
  const [data, fonts, sharp, resvg] = await Promise.allSettled([
    Promise.resolve().then(() => checkData(dependencies.dataDir())),
    Promise.resolve().then(() => checkFonts(dependencies.fontFiles())),
    Promise.resolve().then(dependencies.loadSharp),
    Promise.resolve().then(dependencies.loadResvg),
  ]);
  const checks = {
    data: data.status === "fulfilled",
    fonts: fonts.status === "fulfilled",
    sharp: sharp.status === "fulfilled",
    resvg: resvg.status === "fulfilled",
  };

  return {
    status: Object.values(checks).every(Boolean) ? "ok" : "unhealthy",
    checks,
  };
}

async function checkData(dataDir: string): Promise<void> {
  const info = await stat(dataDir);
  if (!info.isDirectory()) {
    throw new Error("The data path is not a directory.");
  }
  await access(dataDir, constants.R_OK | constants.W_OK);

  await Promise.all(
    ["taps.yaml", "display.yaml"].map(async (name) => {
      const handle = await open(
        /* turbopackIgnore: true */ path.join(
          /* turbopackIgnore: true */ dataDir,
          name,
        ),
        "r+",
      );
      await handle.close();
    }),
  );

  const probeDir = await mkdtemp(path.join(dataDir, ".tapframe-health-"));
  try {
    const probe = path.join(probeDir, "probe");
    await writeFile(probe, "ok", "utf8");
    if ((await readFile(probe, "utf8")) !== "ok") {
      throw new Error("The data directory probe could not be read.");
    }
  } finally {
    await rm(probeDir, { recursive: true, force: true });
  }
}

async function checkFonts(fontFiles: string[]): Promise<void> {
  if (fontFiles.length !== 4) {
    throw new Error("Expected four renderer fonts.");
  }
  await Promise.all(fontFiles.map((file) => access(file, constants.R_OK)));
}
