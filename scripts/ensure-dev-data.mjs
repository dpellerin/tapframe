#!/usr/bin/env node

import { access, cp, mkdir, rename, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDirectory, "..");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function ensureDevData(repoRoot = defaultRepoRoot) {
  const source = path.join(repoRoot, "data");
  const devRoot = path.join(repoRoot, ".dev");
  const target = path.join(devRoot, "data");

  if (await exists(target)) {
    const targetStat = await stat(target);
    if (!targetStat.isDirectory()) {
      throw new Error(`development data path is not a directory: ${target}`);
    }
    return { created: false, target };
  }

  if (!(await exists(path.join(source, "taps.yaml")))) {
    throw new Error(`starter tap data is missing: ${path.join(source, "taps.yaml")}`);
  }

  await mkdir(devRoot, { recursive: true });
  const temporary = path.join(devRoot, `.data-init-${randomUUID()}`);

  try {
    await cp(source, temporary, { recursive: true, errorOnExist: true });
    try {
      await rename(temporary, target);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        (error.code === "EEXIST" || error.code === "ENOTEMPTY")
      ) {
        return { created: false, target };
      }
      throw error;
    }
  } finally {
    await rm(temporary, { force: true, recursive: true });
  }

  return { created: true, target };
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  try {
    const result = await ensureDevData();
    console.log(
      result.created
        ? `Created isolated development data: ${result.target}`
        : `Using existing development data: ${result.target}`,
    );
  } catch (error) {
    console.error(`tapframe: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
