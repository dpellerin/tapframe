import { describe, expect, it } from "vitest";
import { boardCapacity, parseBoardLayout } from "./layout";

describe("boardCapacity", () => {
  it("is columns times rows", () => {
    expect(boardCapacity({ maxPerRow: 4, rows: 1 })).toBe(4);
    expect(boardCapacity({ maxPerRow: 3, rows: 2 })).toBe(6);
  });
});

describe("parseBoardLayout", () => {
  it("accepts a device board", () => {
    expect(parseBoardLayout({ maxPerRow: 4, rows: 1 })).toEqual({
      maxPerRow: 4,
      rows: 1,
    });
  });

  it("rejects junk", () => {
    expect(parseBoardLayout(null)).toBeNull();
    expect(parseBoardLayout({ maxPerRow: 0, rows: 1 })).toBeNull();
    expect(parseBoardLayout({ maxPerRow: 4.5, rows: 1 })).toBeNull();
  });
});
