export type DisplaySize = {
  id: string;
  width: number;
  height: number;
  label: string;
};

export type DisplayField = {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
};

export type BoardLayout = {
  maxPerRow: number;
  rows: number;
};

export type DisplayManifest = {
  id: string;
  name: string;
  description: string;
  sizes: DisplaySize[];
  fields: DisplayField[];
  layout: BoardLayout;
};

export type DisplaySettings = {
  adapter: string;
  size: string;
  fields: Record<string, string>;
};

export type SendContext = {
  image: Buffer;
  width: number;
  height: number;
  settings: Record<string, string>;
};

export type SendResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type DisplayAdapter = {
  manifest: DisplayManifest;
  send: (context: SendContext) => Promise<SendResult>;
};

export const DEFAULT_DISPLAY: DisplaySettings = {
  adapter: "fraimic",
  size: "standard",
  fields: { host: "fraimic.local" },
};
