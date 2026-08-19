import path from "node:path";

const FONT_NAMES = [
  "SourceSerif4-Regular.ttf",
  "SourceSerif4-Semibold.ttf",
  "SourceSans3-Regular.ttf",
  "SourceSans3-Semibold.ttf",
] as const;

export function rendererFontFiles(root = process.cwd()): string[] {
  return FONT_NAMES.map((name) => path.join(root, "src", "lib", "fonts", name));
}
