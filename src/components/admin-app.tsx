"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_BOARD_LAYOUT,
  boardCapacity,
} from "@/lib/display/layout";
import type { DisplayManifest, DisplaySettings } from "@/lib/display/types";
import { DEFAULT_DISPLAY } from "@/lib/display/types";
import { fitPreviewCanvas } from "@/lib/preview-sizes";
import { DEFAULT_TITLE, parseMenu, quietSubtitle, type Tap } from "@/lib/taps";
import { DisplaySettingsDialog } from "./display-settings-dialog";
import { TapEditor, type TapDraft } from "./tap-editor";

type AdminAppProps = {
  initialTitle?: string;
  initialSubtitle?: string;
  initialTaps: Tap[];
  initialDisplay?: DisplaySettings;
  displays?: DisplayManifest[];
};

export function AdminApp({
  initialTitle = DEFAULT_TITLE,
  initialSubtitle = "",
  initialTaps,
  initialDisplay = DEFAULT_DISPLAY,
  displays = [],
}: AdminAppProps) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(
    initialSubtitle || quietSubtitle(initialTaps.length),
  );
  const [taps, setTaps] = useState<TapDraft[]>(() => withKeys(initialTaps));
  const [display, setDisplay] = useState(initialDisplay);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [frameBlob, setFrameBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "render" | "send" | null>(null);
  const [libraryLogos, setLibraryLogos] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLElement>(null);
  const lastSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const snapshot = JSON.stringify({
      title,
      subtitle,
      taps: taps.map(stripKey),
    });
    if (lastSnapshotRef.current === null) {
      lastSnapshotRef.current = snapshot;
      return;
    }
    if (lastSnapshotRef.current === snapshot) {
      return;
    }
    lastSnapshotRef.current = snapshot;

    const save = async () => {
      const parsed = parseMenu({ title, subtitle, taps: taps.map(stripKey) });
      if (!parsed.ok) {
        setStatus("Not saved yet.");
        return;
      }
      setBusy("save");
      setError(null);
      try {
        const response = await fetch("/api/taps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.menu),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Could not save.");
          return;
        }
        setStatus("Saved.");
      } catch {
        setError("Could not save.");
      } finally {
        setBusy(null);
      }
    };

    const timer = setTimeout(() => void save(), 1000);
    return () => clearTimeout(timer);
  }, [title, subtitle, taps]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/logos")
      .then(async (response) => {
        const payload = (await response.json()) as { logos?: string[] };
        if (!cancelled && response.ok && payload.logos) {
          setLibraryLogos(payload.logos);
        }
      })
      .catch(() => {
        // Library stays empty; upload still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDisplay =
    displays.find((item) => item.id === display.adapter) ?? displays[0];
  const size =
    activeDisplay?.sizes.find((item) => item.id === display.size) ??
    activeDisplay?.sizes[0] ?? {
      id: "standard",
      width: 1600,
      height: 1200,
      label: "1600 × 1200",
    };
  const previewSize = size;
  const layout = activeDisplay?.layout ?? DEFAULT_BOARD_LAYOUT;
  const capacity = boardCapacity(layout);

  function updateTap(key: string, next: TapDraft) {
    setTaps((current) => current.map((tap) => (tap.key === key ? next : tap)));
  }

  function moveTap(index: number, direction: -1 | 1) {
    setTaps((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return current;
      }
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function removeTap(key: string) {
    setTaps((current) => current.filter((tap) => tap.key !== key));
  }

  async function removeLibraryLogo(logo: string) {
    const filename = logo.replace(/^logos\//, "");
    const response = await fetch(`/api/logos/${encodeURIComponent(filename)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not delete that logo.");
      return;
    }
    setLibraryLogos((current) => current.filter((item) => item !== logo));
    setTaps((current) =>
      current.map((tap) =>
        tap.logo === logo ? { ...tap, logo: undefined } : tap,
      ),
    );
  }

  function addTap() {
    setTaps((current) => {
      if (current.length >= capacity) {
        return current;
      }
      return [
        ...current,
        {
          key: newKey(),
          name: "",
          style: "",
          abv: "",
          description: "",
        },
      ];
    });
  }

  async function saveDisplaySettings(next: DisplaySettings): Promise<boolean> {
    try {
      const response = await fetch("/api/display", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        return false;
      }
      setDisplay(next);
      setSettingsOpen(false);
      return true;
    } catch {
      return false;
    }
  }

  async function send() {
    const parsed = parseMenu({ title, subtitle, taps: taps.map(stripKey) });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy("send");
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/display/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.menu),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not send to the display.");
        return;
      }
      setStatus(payload.message ?? "Sent.");
    } catch {
      setError("Could not send to the display.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    const parsed = parseMenu({ title, subtitle, taps: taps.map(stripKey) });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const box = previewFrameRef.current;
    const previewCanvas = fitPreviewCanvas({
      boxWidth: box?.clientWidth ?? 800,
      boxHeight: box?.clientHeight ?? 480,
      aspectWidth: size.width,
      aspectHeight: size.height,
      devicePixelRatio: window.devicePixelRatio,
    });

    setBusy("render");
    setError(null);
    setStatus(null);
    try {
      const previewBlob = await requestPng(parsed.menu, previewCanvas, layout);
      const url = URL.createObjectURL(previewBlob);
      setPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return url;
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          previewSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      });
      void requestPng(parsed.menu, size, layout)
        .then((blob) => {
          setFrameBlob(blob);
        })
        .catch(() => {
          setFrameBlob(null);
        });
    } catch {
      setError("Could not generate a preview.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col px-6 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900">
            Tapframe
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy !== null || taps.length === 0}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 disabled:opacity-40"
          >
            {busy === "render" ? "Generating…" : "Generate preview"}
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy !== null || taps.length === 0 || !activeDisplay}
            className="rounded-full border border-stone-900 px-4 py-2 text-sm text-stone-900 hover:bg-white disabled:opacity-40"
          >
            {busy === "send" ? "Sending…" : "Send"}
          </button>
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-2 text-sm text-stone-800 hover:bg-white"
          >
            <SettingsIcon />
            Settings
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : busy === "save" ? (
        <p className="mb-4 text-sm text-stone-500">Saving…</p>
      ) : status ? (
        <p className="mb-4 text-sm text-stone-500">{status}</p>
      ) : null}

      {settingsOpen ? (
        <DisplaySettingsDialog
          initial={display}
          displays={displays}
          onCancel={() => setSettingsOpen(false)}
          onSave={saveDisplaySettings}
        />
      ) : null}

      <div className="flex flex-1 flex-col gap-8">
        <section className="rounded-2xl border border-stone-200/80 bg-white px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-center text-[11px] tracking-[0.16em] text-stone-400 uppercase">
              Headline
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="On tap"
              className="w-full bg-transparent text-center font-serif text-4xl tracking-tight text-stone-900 outline-none placeholder:text-stone-300"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1 block text-center text-[11px] tracking-[0.16em] text-stone-400 uppercase">
              Line under
            </span>
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder={quietSubtitle(taps.length)}
              className="w-full bg-transparent text-center text-base tracking-[0.12em] text-stone-500 outline-none placeholder:text-stone-300 sm:text-sm"
            />
          </label>
        </section>

        {taps.length > capacity ? (
          <p className="text-sm text-stone-500" role="status">
            This display shows the first {capacity} beers.
          </p>
        ) : null}

        <section className="flex flex-wrap items-start justify-center gap-4">
          {taps.length === 0 ? (
            <div className="w-full rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
              <p className="text-stone-600">Nothing on tap yet.</p>
              <button
                type="button"
                onClick={addTap}
                className="mt-4 text-sm text-stone-900 underline underline-offset-4"
              >
                Add the first beer
              </button>
            </div>
          ) : (
            <>
              {taps.map((tap, index) => (
                <TapEditor
                  key={tap.key}
                  tap={tap}
                  index={index}
                  total={taps.length}
                  onChange={(next) => updateTap(tap.key, next)}
                  onMove={(direction) => moveTap(index, direction)}
                  onRemove={() => removeTap(tap.key)}
                  onError={setError}
                  libraryLogos={libraryLogos}
                  onLibraryAdd={(logo) => {
                    setLibraryLogos((current) =>
                      current.includes(logo) ? current : [logo, ...current],
                    );
                  }}
                  onLibraryRemove={(logo) => removeLibraryLogo(logo)}
                />
              ))}
              {taps.length < capacity ? (
                <button
                  type="button"
                  onClick={addTap}
                  className="h-auto min-h-32 w-full shrink-0 rounded-2xl border border-dashed border-stone-300 px-3 py-8 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-800 sm:w-52"
                >
                  Add a tap
                </button>
              ) : null}
            </>
          )}
        </section>

        <section
          data-frame-ready={frameBlob ? "true" : "false"}
          ref={previewSectionRef}
          className="flex flex-1 flex-col items-center gap-3 rounded-2xl border border-stone-200/80 bg-white p-4"
        >
          {previewUrl ? (
            <p
              data-testid="preview-size"
              className="text-xs tracking-[0.14em] text-stone-400 uppercase"
            >
              {previewSize.label}
            </p>
          ) : null}
          <div
            ref={previewFrameRef}
            className="flex w-full items-center justify-center"
            style={{
              aspectRatio: `${previewSize.width} / ${previewSize.height}`,
              width: `min(100%, calc(52vh * ${previewSize.width / previewSize.height}))`,
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`Generated tap menu, ${previewSize.label}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-sm text-stone-400">
                Generate a preview to see the menu.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

async function requestPng(
  menu: { title: string; subtitle: string; taps: unknown },
  canvas: { width: number; height: number },
  layout: { maxPerRow: number; rows: number },
): Promise<Blob> {
  const response = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: menu.title,
      subtitle: menu.subtitle,
      taps: menu.taps,
      width: canvas.width,
      height: canvas.height,
      layout,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Could not render.");
  }
  return response.blob();
}

function withKeys(taps: Tap[]): TapDraft[] {
  return taps.map((tap) => ({
    ...tap,
    key: newKey(),
    abv: formatAbvInput(tap.abv),
  }));
}

function stripKey(tap: TapDraft): Record<string, unknown> {
  return {
    name: tap.name,
    style: tap.style,
    abv: tap.abv,
    description: tap.description,
    ...(tap.logo ? { logo: tap.logo } : {}),
  };
}

function formatAbvInput(abv: number): string {
  return Number.isInteger(abv) ? String(abv) : String(abv);
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7 7 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64L4.86 10.7c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  );
}

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}
