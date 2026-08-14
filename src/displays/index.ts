import type { DisplayAdapter } from "@/lib/display/types";
import { qualifyAdapter } from "@/lib/display/qualify";
import { adapter as fraimic } from "./fraimic";

const candidates: unknown[] = [fraimic];

export function loadDisplayModules(): DisplayAdapter[] {
  const adapters: DisplayAdapter[] = [];
  for (const candidate of candidates) {
    const adapter = qualifyAdapter(candidate);
    if (adapter) {
      adapters.push(adapter);
    }
  }
  return adapters;
}
