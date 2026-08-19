import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

process.env.TAPFRAME_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), "tapframe-test-data-"),
);

afterEach(() => {
  cleanup();
});
