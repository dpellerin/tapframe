import { defaultTapStore } from "@/lib/tap-store";
import { logoFilename } from "@/lib/taps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/api/logos/[filename]">,
) {
  const { filename } = await context.params;
  const safe = logoFilename(filename);
  if (!safe) {
    return new Response("Not found", { status: 404 });
  }

  const bytes = await defaultTapStore.readLogo(safe);
  if (!bytes) {
    return new Response("Not found", { status: 404 });
  }

  const ext = safe.slice(safe.lastIndexOf(".")).toLowerCase();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/logos/[filename]">,
) {
  const { filename } = await context.params;
  const safe = logoFilename(filename);
  if (!safe) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const removed = await defaultTapStore.deleteLogo(safe);
  if (!removed) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
