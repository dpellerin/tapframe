import { describe, expect, it } from "vitest";
import { healthResponse } from "./route";

describe("healthResponse", () => {
  it("returns 200 for a healthy application", () => {
    const response = healthResponse({
      status: "ok",
      checks: { data: true, fonts: true, sharp: true, resvg: true },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 when a prerequisite fails", () => {
    const response = healthResponse({
      status: "unhealthy",
      checks: { data: false, fonts: true, sharp: true, resvg: true },
    });

    expect(response.status).toBe(503);
  });
});
