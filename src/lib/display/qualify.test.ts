import { describe, expect, it } from "vitest";
import { qualifyAdapter } from "./qualify";
import type { DisplayAdapter } from "./types";

const valid: DisplayAdapter = {
  manifest: {
    id: "demo",
    name: "Demo",
    description: "",
    sizes: [{ id: "s", width: 800, height: 480, label: "800 × 480" }],
    layout: { maxPerRow: 2, rows: 1 },
    fields: [{ key: "host", label: "Host", type: "text" }],
  },
  send: async () => ({ ok: true }),
};

describe("qualifyAdapter", () => {
  it("accepts a complete module", () => {
    expect(qualifyAdapter(valid)?.manifest.id).toBe("demo");
  });

  it("rejects a module that cannot send", () => {
    expect(qualifyAdapter({ manifest: valid.manifest })).toBeNull();
  });

  it("rejects a module with no sizes", () => {
    expect(
      qualifyAdapter({
        ...valid,
        manifest: { ...valid.manifest, sizes: [] },
      }),
    ).toBeNull();
  });

  it("rejects a module with a broken board", () => {
    expect(
      qualifyAdapter({
        ...valid,
        manifest: { ...valid.manifest, layout: { maxPerRow: 0, rows: 1 } },
      }),
    ).toBeNull();
  });
});
