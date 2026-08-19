import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { atomicWriteFile } from "./atomic-write";

describe("atomicWriteFile", () => {
  it("replaces a file without leaving a temporary file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "tapframe-atomic-write-"));
    const file = path.join(dir, "taps.yaml");

    await atomicWriteFile(file, "first");
    await atomicWriteFile(file, "second");

    await expect(readFile(file, "utf8")).resolves.toBe("second");
    await expect(readdir(dir)).resolves.toEqual(["taps.yaml"]);
  });
});
