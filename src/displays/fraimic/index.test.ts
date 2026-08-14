import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { createFraimicAdapter, fraimicBaseUrl } from "./index";
import { EL133 } from "./bin";

async function paperPng(width = 1600, height = 1200): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 247, g: 244, b: 238 },
    },
  })
    .png()
    .toBuffer();
}

describe("fraimicBaseUrl", () => {
  it("accepts a hostname or IP", () => {
    expect(fraimicBaseUrl("fraimic.local")).toBe("http://fraimic.local");
    expect(fraimicBaseUrl("http://192.168.1.20/")).toBe("http://192.168.1.20");
  });

  it("rejects junk", () => {
    expect(fraimicBaseUrl("")).toBeNull();
    expect(fraimicBaseUrl("http://evil.example/path")).toBeNull();
  });
});

describe("createFraimicAdapter", () => {
  it("posts a Spectra 6 .bin after the frame answers", async () => {
    const http = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/info")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      expect(url).toBe("http://fraimic.local/api/image");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        "Content-Type": "application/octet-stream",
      });
      expect(init?.body).toBeInstanceOf(Uint8Array);
      expect((init?.body as Uint8Array).byteLength).toBe(EL133.binSize);
      return new Response(null, { status: 200 });
    });

    const adapter = createFraimicAdapter(http as unknown as typeof fetch);
    const result = await adapter.send({
      image: await paperPng(),
      width: 1600,
      height: 1200,
      settings: { host: "fraimic.local" },
    });

    expect(result.ok).toBe(true);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it("includes the frame's reply when the upload is refused", async () => {
    const http = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/info")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("unsupported type", { status: 501 });
    });

    const adapter = createFraimicAdapter(http as unknown as typeof fetch);
    const result = await adapter.send({
      image: await paperPng(),
      width: 1600,
      height: 1200,
      settings: { host: "fraimic.local" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/501/);
      expect(result.error).toMatch(/unsupported type/);
    }
  });

  it("explains when the frame is unreachable", async () => {
    const http = vi.fn(async () => {
      throw new Error("offline");
    });
    const adapter = createFraimicAdapter(http as unknown as typeof fetch);
    const result = await adapter.send({
      image: Buffer.from("png"),
      width: 1600,
      height: 1200,
      settings: { host: "fraimic.local" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/awake/i);
    }
  });
});
