import type { DisplayAdapter, SendResult } from "@/lib/display/types";
import { pngToFraimicBin } from "./bin";

export const FRAIMIC_SIZES = [
  { id: "standard", width: 1600, height: 1200, label: "Standard · 1600 × 1200" },
  { id: "large", width: 2560, height: 1440, label: "Large · 2560 × 1440" },
] as const;

export function fraimicBaseUrl(host: string): string | null {
  const trimmed = host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!trimmed) {
    return null;
  }
  if (!/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(trimmed)) {
    return null;
  }
  return `http://${trimmed}`;
}

export function createFraimicAdapter(
  http: typeof fetch = fetch,
): DisplayAdapter {
  return {
    manifest: {
      id: "fraimic",
      name: "Fraimic",
      description: "Local color e-ink frame on your network.",
      sizes: [...FRAIMIC_SIZES],
      layout: { maxPerRow: 4, rows: 1 },
      fields: [
        {
          key: "host",
          label: "Frame address",
          type: "text",
          placeholder: "fraimic.local",
        },
      ],
    },

    async send(context): Promise<SendResult> {
      const base = fraimicBaseUrl(context.settings.host ?? "");
      if (!base) {
        return { ok: false, error: "Enter a frame address like fraimic.local." };
      }

      const signal = AbortSignal.timeout(15_000);
      try {
        const info = await http(`${base}/api/info`, { signal });
        if (!info.ok) {
          return {
            ok: false,
            error: "The frame did not answer. Tap it to wake, then try again.",
          };
        }
      } catch {
        return {
          ok: false,
          error:
            "Cannot reach the frame. This app must be on the same network, and the frame must be awake.",
        };
      }

      let packed: Buffer;
      try {
        packed = await pngToFraimicBin(
          context.image,
          context.width,
          context.height,
        );
      } catch {
        return {
          ok: false,
          error: "Could not convert the menu into the frame's image format.",
        };
      }

      try {
        const response = await http(`${base}/api/image`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Uint8Array(packed),
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          const detail = (await response.text()).trim().slice(0, 200);
          return {
            ok: false,
            error: detail
              ? `The frame refused the image (${response.status}): ${detail}`
              : `The frame refused the image (${response.status}).`,
          };
        }
        return { ok: true, message: "Sent to the Fraimic." };
      } catch {
        return {
          ok: false,
          error: "The frame dropped the upload. Tap it awake and send again.",
        };
      }
    },
  };
}

export const adapter = createFraimicAdapter();
