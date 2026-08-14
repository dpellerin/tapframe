import { describe, expect, it } from "vitest";
import { loadDisplayModules } from "./index";

describe("loadDisplayModules", () => {
  it("loads the Fraimic module", () => {
    const modules = loadDisplayModules();
    expect(modules.map((item) => item.manifest.id)).toContain("fraimic");
  });
});
