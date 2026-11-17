import { describe, expect, it } from "vitest";
import { buildMenuSvg, renderMenuPng } from "./render";

// User text must stay text in the SVG passed to the native renderer.
describe("menu renderer trust boundary", () => {
  it("escapes markup in every user-controlled text field", async () => {
    const payload = '<script id="injected">&\'x</script>';
    const svg = await buildMenuSvg({
      title: payload,
      subtitle: payload,
      taps: [{ name: payload, style: payload, description: payload, abv: 5 }],
      width: 1600,
      height: 1200,
    });
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("<SCRIPT");
    expect(svg).toContain("&lt;script");
    expect(svg).toContain("&lt;SCRIPT");
    expect(svg).toContain("&quot;");
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&apos;");
  });

  it("embeds uploaded SVG as data rather than interpolated SVG markup", async () => {
    const logo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>');
    const options = {
      title: "Synthetic fixture",
      taps: [{ name: "Fixture beer", style: "Ale", description: "Test", abv: 5, logo: "logos/test.svg" }],
      width: 800,
      height: 480,
      readLogo: async () => logo,
    };
    const svg = await buildMenuSvg(options);
    expect(svg).toContain(`data:image/svg+xml;base64,${logo.toString("base64")}`);
    expect(svg).not.toContain('<rect width="20"');
    const png = await renderMenuPng(options);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });
});
