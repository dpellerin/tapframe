import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkHealth } from "./health";

async function healthyDependencies() {
  const root = await mkdtemp(path.join(tmpdir(), "tapframe-health-"));
  const dataDir = path.join(root, "data");
  const fontsDir = path.join(root, "fonts");
  await mkdir(dataDir);
  await mkdir(fontsDir);
  await Promise.all([
    writeFile(path.join(dataDir, "taps.yaml"), "taps: []"),
    writeFile(path.join(dataDir, "display.yaml"), "adapter: fraimic"),
  ]);
  const fonts = await Promise.all(
    Array.from({ length: 4 }, async (_, index) => {
      const file = path.join(fontsDir, `${index}.ttf`);
      await writeFile(file, "font");
      return file;
    }),
  );

  return {
    dataDir: () => dataDir,
    fontFiles: () => fonts,
    loadSharp: async () => ({}),
    loadResvg: async () => ({}),
  };
}

describe("checkHealth", () => {
  it("reports every local prerequisite", async () => {
    await expect(checkHealth(await healthyDependencies())).resolves.toEqual({
      status: "ok",
      checks: { data: true, fonts: true, sharp: true, resvg: true },
    });
  });

  it("reports failures without exposing their details", async () => {
    const dependencies = await healthyDependencies();
    dependencies.loadSharp = async () => {
      throw new Error("secret native path");
    };

    const result = await checkHealth(dependencies);
    expect(result).toEqual({
      status: "unhealthy",
      checks: { data: true, fonts: true, sharp: false, resvg: true },
    });
    expect(JSON.stringify(result)).not.toContain("secret native path");
  });
});
