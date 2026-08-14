import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  EL133,
  EL315,
  closestPaletteIndex,
  deviceColorIndex,
  packEl133,
  packEl315,
  panelForSource,
  pngToFraimicBin,
  rotateCw90,
} from "./bin";

describe("panelForSource", () => {
  it("maps the standard landscape menu to the 13.3 inch panel", () => {
    expect(panelForSource(1600, 1200).id).toBe("133");
  });

  it("maps the large landscape menu to the 31.5 inch panel", () => {
    expect(panelForSource(2560, 1440).id).toBe("315");
  });
});

describe("closestPaletteIndex", () => {
  it("maps menu paper and ink to white and black", () => {
    expect(closestPaletteIndex(247, 244, 238)).toBe(1);
    expect(closestPaletteIndex(28, 26, 23)).toBe(0);
  });

  it("keeps the six Spectra colors", () => {
    expect(closestPaletteIndex(255, 255, 255)).toBe(1);
    expect(closestPaletteIndex(255, 255, 0)).toBe(2);
    expect(closestPaletteIndex(255, 0, 0)).toBe(3);
    expect(closestPaletteIndex(0, 0, 255)).toBe(4);
    expect(closestPaletteIndex(0, 255, 0)).toBe(5);
  });
});

describe("deviceColorIndex", () => {
  it("snaps cream paper and dark type to white and black", () => {
    expect(deviceColorIndex(247, 244, 238)).toBe(1);
    expect(deviceColorIndex(239, 234, 225)).toBe(1);
    expect(deviceColorIndex(212, 207, 196)).toBe(1);
    expect(deviceColorIndex(28, 26, 23)).toBe(0);
    expect(deviceColorIndex(50, 47, 43)).toBe(0);
  });

  it("keeps saturated logo colors", () => {
    expect(deviceColorIndex(200, 30, 30)).toBe(3);
    expect(deviceColorIndex(255, 255, 0)).toBe(2);
  });
});

describe("rotateCw90", () => {
  it("sends the landscape top-left to the portrait top-right", () => {
    const rgb = Uint8Array.from([
      1, 0, 0, 2, 0, 0,
      3, 0, 0, 4, 0, 0,
    ]);
    const rotated = rotateCw90(rgb, 2, 2);
    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(2);
    expect([...rotated.data]).toEqual([
      3, 0, 0, 1, 0, 0,
      4, 0, 0, 2, 0, 0,
    ]);
  });
});

describe("packEl133", () => {
  it("matches the published 13.3 inch layout", () => {
    const codes = new Uint8Array(EL133.width * EL133.height);
    codes[0] = 0x0;
    codes[1] = 0x1;
    codes[2] = 0x2;
    codes[3] = 0x3;
    codes[600] = 0x5;
    codes[601] = 0x6;

    const packed = packEl133(codes);
    expect(packed.length).toBe(EL133.binSize);
    expect(packed[0]).toBe(0x01);
    expect(packed[1]).toBe(0x23);
    expect(packed[EL133.binSize / 2]).toBe(0x56);
  });
});

describe("packEl315", () => {
  it("matches the published 31.5 inch first bytes and padding", () => {
    const codes = new Uint8Array(EL315.width * EL315.height);
    const at = (x: number, y: number, code: number) => {
      codes[y * EL315.width + x] = code;
    };
    at(0, 2559, 0x0);
    at(1, 2559, 0x1);
    at(0, 2558, 0x2);
    at(1, 2558, 0x3);

    const packed = packEl315(codes);
    expect(packed.length).toBe(EL315.binSize);
    expect(packed[0]).toBe(0x01);
    expect(packed[1]).toBe(0x23);

    const ic4 = 3 * 288_000;
    expect(packed.subarray(ic4 + 80, ic4 + 400).every((byte) => byte === 0x11)).toBe(
      true,
    );
  });
});

describe("pngToFraimicBin", () => {
  it("emits a 13.3 inch frame buffer from a landscape PNG", async () => {
    const png = await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: { r: 247, g: 244, b: 238 },
      },
    })
      .png()
      .toBuffer();

    const packed = await pngToFraimicBin(png, 1600, 1200);
    expect(packed.length).toBe(EL133.binSize);
    expect(packed[0]).toBe(0x11);
  });
});
