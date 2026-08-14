import { defaultTapStore } from "@/lib/tap-store";
import { parseMenu } from "@/lib/taps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menu = await defaultTapStore.load();
    return Response.json(menu);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load taps.";
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

  const parsed = parseMenu(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await defaultTapStore.save(parsed.menu);
    return Response.json(parsed.menu);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save taps.";
    return Response.json({ error: message }, { status: 500 });
  }
}
