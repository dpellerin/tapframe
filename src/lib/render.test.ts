import { describe, expect, it } from "vitest";
import { buildMenuSvg, parseCanvas, renderMenuPng } from "./render";
import type { Tap } from "./taps";

const sample: Tap[] = [
  {
    name: "Helles",
    style: "Lager",
    abv: 4.8,
    description: "Crisp and easy. The weeknight beer.",
  },
  {
    name: "House Pale",
    style: "Pale Ale",
    abv: 5.4,
    description: "Citrus, not bitter.",
    logo: "logos/missing.png",
  },
];

describe("parseCanvas", () => {
  it("accepts the preview sizes", () => {
    expect(parseCanvas(800, 480)).toEqual({ width: 800, height: 480 });
    expect(parseCanvas(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });

  it("rejects junk", () => {
    expect(parseCanvas(100, 480)).toBeNull();
    expect(parseCanvas(800.5, 480)).toBeNull();
    expect(parseCanvas("800", 480)).toBeNull();
  });
});

describe("buildMenuSvg", () => {
  it("draws beers left to right by name", async () => {
    const svg = await buildMenuSvg({
      title: "On tap",
      subtitle: "Two on · August 14",
      taps: sample,
      width: 800,
      height: 480,
      readLogo: async () => null,
    });

    expect(svg).toContain("Helles");
    expect(svg).toContain("House");
    expect(svg).toContain("Pale");
    expect(svg.indexOf("Helles")).toBeLessThan(svg.indexOf("House"));
    expect(svg).toContain("LAGER");
    expect(svg).toContain("4.8%");
    expect(svg).toContain("Crisp and easy");
    expect(svg).toContain("On tap");
    expect(svg).toContain("Two on · August 14");
  });

  it("keeps a two-line description in full", async () => {
    const svg = await buildMenuSvg({
      title: "On tap",
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp and easy. The weeknight beer.",
        },
        {
          name: "House Pale",
          style: "Pale Ale",
          abv: 5.4,
          description: "Citrus, not bitter.",
        },
        {
          name: "Dark Mild",
          style: "Mild",
          abv: 3.6,
          description: "Soft, chocolate, low lift.",
        },
        {
          name: "Winter Ale",
          style: "Ale",
          abv: 12.5,
          description: "Dark fruit and a long finish.",
        },
      ],
      width: 1600,
      height: 1200,
    });

    expect(svg).toContain("Crisp and easy.");
    expect(svg).toContain("weeknight");
    expect(svg).toContain("beer.");
    expect(svg).toContain("Dark fruit");
    expect(svg).toContain("long finish.");
    expect(svg).not.toContain("…");
  });

  it("places beer content in the vertical middle of the column", async () => {
    const svg = await buildMenuSvg({
      title: "On tap",
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp.",
        },
      ],
      width: 800,
      height: 480,
    });

    const cy = Number(/<circle cx="[^"]+" cy="([^"]+)"/.exec(svg)?.[1]);
    expect(cy).toBeGreaterThan(180);
    expect(cy).toBeLessThan(320);
  });

  it("keeps four beers on one row for a 4-across board", async () => {
    const taps = Array.from({ length: 4 }, (_, index) => ({
      name: `Beer ${index + 1}`,
      style: "Ale",
      abv: 5,
      description: "Notes.",
    }));
    const svg = await buildMenuSvg({
      title: "On tap",
      taps,
      width: 1600,
      height: 1200,
      layout: { maxPerRow: 4, rows: 1 },
    });
    const xs = [...svg.matchAll(/<circle cx="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(xs).toHaveLength(4);
    expect(new Set(xs).size).toBe(4);
  });

  it("wraps to a second row when the device allows it", async () => {
    const taps = Array.from({ length: 5 }, (_, index) => ({
      name: `Beer ${index + 1}`,
      style: "Ale",
      abv: 5,
      description: "Notes.",
    }));
    const svg = await buildMenuSvg({
      title: "On tap",
      taps,
      width: 1600,
      height: 1200,
      layout: { maxPerRow: 3, rows: 2 },
    });
    const names = [...svg.matchAll(/>(Beer \d+)</g)].map((match) => match[1]);
    expect(names).toEqual(["Beer 1", "Beer 2", "Beer 3", "Beer 4", "Beer 5"]);
    const xs = [...svg.matchAll(/<circle cx="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(xs[0]).toBe(xs[3]);
    expect(xs[1]).not.toBe(xs[0]);
  });

  it("draws only what the board can hold", async () => {
    const taps = Array.from({ length: 6 }, (_, index) => ({
      name: `Beer ${index + 1}`,
      style: "Ale",
      abv: 5,
      description: "Notes.",
    }));
    const svg = await buildMenuSvg({
      title: "On tap",
      taps,
      width: 1600,
      height: 1200,
      layout: { maxPerRow: 4, rows: 1 },
    });
    expect(svg).toContain("Beer 4");
    expect(svg).not.toContain("Beer 5");
  });

  it("aligns logos across columns even when copy lengths differ", async () => {
    const svg = await buildMenuSvg({
      title: "On tap",
      taps: [
        {
          name: "A",
          style: "Lager",
          abv: 4.8,
          description: "Short.",
        },
        {
          name: "Imperial Stout Extra",
          style: "Ale",
          abv: 8,
          description: "A much longer description that wraps across lines.",
        },
      ],
      width: 800,
      height: 480,
    });

    const cys = [...svg.matchAll(/<circle [^>]*cy="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(cys.length).toBeGreaterThanOrEqual(2);
    expect(cys[0]).toBe(cys[1]);
  });

  it("draws a custom board title", async () => {
    const svg = await buildMenuSvg({
      title: "The cellar",
      taps: sample,
      width: 800,
      height: 480,
    });
    expect(svg).toContain("The cellar");
    expect(svg).toMatch(/font-size="(?:5[0-9]|[6-9][0-9]|9[0-2])"/);
  });

  it("still draws a mark when a logo file is missing", async () => {
    const svg = await buildMenuSvg({
      taps: sample,
      width: 800,
      height: 480,
      readLogo: async () => null,
    });

    expect(svg).toContain("<path");
    expect(svg).not.toContain("data:image");
  });

  it("escapes xml in beer names", async () => {
    const svg = await buildMenuSvg({
      taps: [
        {
          name: "Hops & Dreams",
          style: "IPA",
          abv: 6.2,
          description: "A <hoppy> pale.",
        },
      ],
      width: 800,
      height: 480,
    });

    expect(svg).toContain("Hops &amp; Dreams");
    expect(svg).toContain("&lt;hoppy&gt;");
    expect(svg).not.toContain("Hops & Dreams");
  });
});

describe("renderMenuPng", () => {
  it("returns a PNG buffer", async () => {
    const png = await renderMenuPng({
      taps: sample,
      width: 800,
      height: 480,
    });

    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.length).toBeGreaterThan(1000);
  });
});
