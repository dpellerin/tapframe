import { describe, expect, it } from "vitest";
import { parseDisplaySettings } from "./settings";
import { DEFAULT_DISPLAY } from "./types";

describe("parseDisplaySettings", () => {
  it("returns defaults for empty input", () => {
    expect(parseDisplaySettings(null)).toEqual(DEFAULT_DISPLAY);
  });

  it("keeps adapter, size, and field values", () => {
    expect(
      parseDisplaySettings({
        adapter: "fraimic",
        size: "large",
        fields: { host: "192.168.1.20" },
      }),
    ).toEqual({
      adapter: "fraimic",
      size: "large",
      fields: { host: "192.168.1.20" },
    });
  });
});
