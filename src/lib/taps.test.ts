import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTapStore } from "./tap-store";
import {
  DEFAULT_TITLE,
  logoFilename,
  parseMenu,
  parseTapList,
  quietSubtitle,
} from "./taps";

describe("parseTapList", () => {
  it("parses a wrapped taps list", () => {
    const result = parseTapList({
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp and easy.",
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp and easy.",
        },
      ],
    });
  });

  it("allows a missing logo", () => {
    const result = parseTapList([
      { name: "House Pale", style: "Pale Ale", abv: "5.4", description: "" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.taps[0]?.logo).toBeUndefined();
    }
  });

  it("normalizes a logo to logos/<filename>", () => {
    const result = parseTapList([
      {
        name: "Stout",
        style: "Stout",
        abv: 6,
        description: "Dark.",
        logo: "logos/stout.png",
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.taps[0]?.logo).toBe("logos/stout.png");
    }
  });

  it("rejects a tap without a name", () => {
    const result = parseTapList([{ style: "Lager", abv: 5, description: "" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/name/i);
    }
  });

  it("rejects an out-of-range ABV", () => {
    const result = parseTapList([
      { name: "Rocket Fuel", style: "Barleywine", abv: 80, description: "" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("allows more beers than a single display may show", () => {
    const result = parseTapList(
      Array.from({ length: 5 }, (_, index) => ({
        name: `Beer ${index + 1}`,
        style: "Ale",
        abv: 5,
        description: "",
      })),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.taps).toHaveLength(5);
    }
  });

  it("normalizes a path-shaped logo down to a filename", () => {
    const result = parseTapList([
      {
        name: "Helles",
        style: "Lager",
        abv: 4.8,
        description: "",
        logo: "../secret.png",
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.taps[0]?.logo).toBe("logos/secret.png");
    }
  });
});

describe("parseMenu", () => {
  it("defaults the title when none is present", () => {
    const result = parseMenu({
      taps: [{ name: "Helles", style: "Lager", abv: 4.8, description: "" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.menu.title).toBe(DEFAULT_TITLE);
    }
  });

  it("keeps a custom subtitle", () => {
    const result = parseMenu({
      title: "On tap",
      subtitle: "Friday night",
      taps: [{ name: "Helles", style: "Lager", abv: 4.8, description: "" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.menu.subtitle).toBe("Friday night");
    }
  });

  it("keeps a custom title", () => {
    const result = parseMenu({
      title: "The cellar",
      taps: [{ name: "Helles", style: "Lager", abv: 4.8, description: "" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.menu.title).toBe("The cellar");
    }
  });
});

describe("quietSubtitle", () => {
  it("names the count and the date", () => {
    expect(quietSubtitle(4, new Date("2026-08-14T12:00:00"))).toBe(
      "Four on · August 14",
    );
  });
});

describe("logoFilename", () => {
  it("accepts a bare filename", () => {
    expect(logoFilename("helles.png")).toBe("helles.png");
  });

  it("strips a logos/ prefix", () => {
    expect(logoFilename("logos/helles.png")).toBe("helles.png");
  });

  it("rejects parent segments", () => {
    expect(logoFilename("../etc/passwd")).toBe("passwd");
    expect(logoFilename("..")).toBeNull();
  });
});

describe("createTapStore", () => {
  it("returns an empty list when the file is missing", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    await expect(store.load()).resolves.toEqual({
      title: DEFAULT_TITLE,
      subtitle: "",
      taps: [],
    });
  });

  it("round-trips taps and omits a missing logo", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    await store.save({
      title: "On tap",
      subtitle: "",
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp and easy.",
        },
      ],
    });

    const text = await readFile(path.join(dir, "taps.yaml"), "utf8");
    expect(text).toContain("Helles");
    expect(text).toContain("On tap");
    expect(text).not.toContain("logo:");

    await expect(store.load()).resolves.toEqual({
      title: "On tap",
      subtitle: "",
      taps: [
        {
          name: "Helles",
          style: "Lager",
          abv: 4.8,
          description: "Crisp and easy.",
        },
      ],
    });
  });

  it("writes and reads a logo file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    const stored = await store.saveLogo("pale.png", Buffer.from("fake-png"));
    expect(stored.startsWith("logos/")).toBe(true);
    const bytes = await store.readLogo(stored);
    expect(bytes?.toString()).toBe("fake-png");
    await expect(store.listLogos()).resolves.toEqual([stored]);
  });

  it("lists only image logos and skips empty folders", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    await expect(store.listLogos()).resolves.toEqual([]);
    await store.saveLogo("mark.svg", Buffer.from("<svg></svg>"));
    await writeFile(path.join(dir, "logos", "readme.txt"), "nope");
    const listed = await store.listLogos();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.endsWith(".svg")).toBe(true);
  });

  it("deletes a logo from the library", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    const stored = await store.saveLogo("old.png", Buffer.from("old"));
    await expect(store.deleteLogo(stored)).resolves.toBe(true);
    await expect(store.listLogos()).resolves.toEqual([]);
    await expect(store.deleteLogo(stored)).resolves.toBe(false);
  });

  it("rejects saving an invalid list", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    const store = createTapStore(dir);
    await expect(
      store.save({
        title: "On tap",
        subtitle: "",
        taps: [{ name: "", style: "", abv: 5, description: "" }],
      }),
    ).rejects.toThrow(/name/i);
  });

  it("throws when yaml is malformed", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tap-ink-"));
    await writeFile(path.join(dir, "taps.yaml"), "taps: [", "utf8");
    const store = createTapStore(dir);
    await expect(store.load()).rejects.toThrow(/taps.yaml/i);
  });
});
