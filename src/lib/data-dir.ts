import "server-only";

import path from "node:path";

type DataDirEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "NODE_ENV" | "TAPFRAME_DATA_DIR">
>;

export function resolveDataDir(
  environment: DataDirEnvironment = process.env,
  cwd = process.cwd(),
): string {
  const configured = environment.TAPFRAME_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(cwd, configured);
  }

  if (environment.NODE_ENV === "production") {
    throw new Error("TAPFRAME_DATA_DIR must be set in production.");
  }

  return path.join(cwd, ".dev", "data");
}
