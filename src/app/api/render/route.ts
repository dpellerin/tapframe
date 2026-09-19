import { DEFAULT_BOARD_LAYOUT, parseBoardLayout } from "@/lib/display/layout";
import { getDisplay } from "@/lib/display/registry";
import { parseCanvas, renderMenuPng } from "@/lib/render";
import { defaultTapStore } from "@/lib/tap-store";
import { parseMenu } from "@/lib/taps";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }

  const raw = body as {
    taps?: unknown;
    title?: unknown;
    subtitle?: unknown;
    width?: unknown;
    height?: unknown;
    maxPerRow?: unknown;
    rows?: unknown;
    layout?: unknown;
    device?: unknown;
  };
  const parsed = parseMenu({
    title: raw.title,
    subtitle: raw.subtitle,
    taps: raw.taps,
  });
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const canvas = parseCanvas(raw.width, raw.height);
  if (!canvas) {
    return Response.json({ error: "Choose a valid canvas size." }, { status: 400 });
  }

  const layout =
    parseBoardLayout(raw.layout) ??
    parseBoardLayout({ maxPerRow: raw.maxPerRow, rows: raw.rows }) ??
    DEFAULT_BOARD_LAYOUT;

  try {
    let png = await renderMenuPng({
      title: parsed.menu.title,
      subtitle: parsed.menu.subtitle,
      taps: parsed.menu.taps,
      width: canvas.width,
      height: canvas.height,
      layout,
      readLogo: (stored) => defaultTapStore.readLogo(stored),
    });

    if (typeof raw.device === "string" && raw.device) {
      const adapter = getDisplay(raw.device);
      if (adapter?.simulate) {
        png = await adapter.simulate(png);
      }
    }

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not render menu.";
    return Response.json({ error: message }, { status: 500 });
  }
}
