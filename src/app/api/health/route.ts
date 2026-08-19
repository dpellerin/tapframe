import { checkHealth, type HealthResult } from "@/lib/health";

export const runtime = "nodejs";

export async function GET() {
  const result = await checkHealth();
  return healthResponse(result);
}

export function healthResponse(result: HealthResult) {
  return Response.json(result, {
    status: result.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
