import { defaultTapStore } from "@/lib/tap-store";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function GET() {
  try {
    const logos = await defaultTapStore.listLogos();
    return Response.json({ logos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list logos.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a logo image." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 });
  }

  if (file.type && !ALLOWED.has(file.type)) {
    return Response.json(
      { error: "Use a PNG, JPEG, WebP, or SVG logo." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const logo = await defaultTapStore.saveLogo(file.name || "logo.png", bytes);
    return Response.json({ logo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save logo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
