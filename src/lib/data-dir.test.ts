import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDataDir } from "./data-dir";

describe("resolveDataDir", () => {
  it("uses an isolated configured directory", () => {
    expect(
      resolveDataDir(
        { NODE_ENV: "test", TAPFRAME_DATA_DIR: "test-data" },
        "/workspace",
      ),
    ).toBe(path.join("/workspace", "test-data"));
  });

  it("defaults development to .dev/data", () => {
    expect(resolveDataDir({ NODE_ENV: "development" }, "/workspace")).toBe(
      path.join("/workspace", ".dev", "data"),
    );
  });

  it("fails closed in production", () => {
    expect(() => resolveDataDir({ NODE_ENV: "production" }, "/workspace")).toThrow(
      /TAPFRAME_DATA_DIR/,
    );
  });
});
