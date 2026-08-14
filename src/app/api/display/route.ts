import { listDisplays } from "@/lib/display/registry";
import { parseDisplaySettings } from "@/lib/display/settings";
import { defaultDisplayStore } from "@/lib/display/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await defaultDisplayStore.load();
    return Response.json({
      settings,
      displays: listDisplays().map((adapter) => adapter.manifest),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load display settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }

  const settings = parseDisplaySettings(body);
  try {
    await defaultDisplayStore.save(settings);
    return Response.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save display settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
