import { describe, expect, it } from "vitest";
import { fitPreviewCanvas } from "./preview-sizes";

describe("fitPreviewCanvas", () => {
  it("fills a wide box at the target aspect and device pixel ratio", () => {
    expect(
      fitPreviewCanvas({
        boxWidth: 1000,
        boxHeight: 400,
        aspectWidth: 800,
        aspectHeight: 480,
        devicePixelRatio: 2,
      }),
    ).toEqual({ width: 1333, height: 800 });
  });

  it("letterboxes when the box is too tall", () => {
    expect(
      fitPreviewCanvas({
        boxWidth: 800,
        boxHeight: 800,
        aspectWidth: 800,
        aspectHeight: 480,
        devicePixelRatio: 1,
      }),
    ).toEqual({ width: 800, height: 480 });
  });

  it("clamps to the renderer maximum", () => {
    const canvas = fitPreviewCanvas({
      boxWidth: 3000,
      boxHeight: 2000,
      aspectWidth: 1600,
      aspectHeight: 1200,
      devicePixelRatio: 3,
    });
    expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(4000);
    expect(canvas.width / canvas.height).toBeCloseTo(1600 / 1200, 2);
  });
});
