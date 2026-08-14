import { resolveDisplay } from "@/lib/display/registry";
import { defaultDisplayStore } from "@/lib/display/store";
import { renderMenuPng } from "@/lib/render";
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

  const parsed = parseMenu(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const settings = await defaultDisplayStore.load();
    const { adapter, size } = resolveDisplay(settings);
    const image = await renderMenuPng({
      title: parsed.menu.title,
      subtitle: parsed.menu.subtitle,
      taps: parsed.menu.taps,
      width: size.width,
      height: size.height,
      layout: adapter.manifest.layout,
      readLogo: (stored) => defaultTapStore.readLogo(stored),
    });

    const result = await adapter.send({
      image,
      width: size.width,
      height: size.height,
      settings: settings.fields,
    });

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 502 });
    }
    return Response.json({ ok: true, message: result.message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send the menu.";
    return Response.json({ error: message }, { status: 500 });
  }
}
