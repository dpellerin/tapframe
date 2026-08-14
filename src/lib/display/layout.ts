import type { BoardLayout } from "./types";

export const DEFAULT_BOARD_LAYOUT: BoardLayout = { maxPerRow: 4, rows: 1 };

export function boardCapacity(layout: BoardLayout): number {
  return layout.maxPerRow * layout.rows;
}

export function parseBoardLayout(value: unknown): BoardLayout | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (!isCount(raw.maxPerRow) || !isCount(raw.rows)) {
    return null;
  }
  return { maxPerRow: raw.maxPerRow, rows: raw.rows };
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}
