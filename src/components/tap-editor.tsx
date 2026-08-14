"use client";

import { useState } from "react";
import type { Tap } from "@/lib/taps";
import { ConfirmDialog } from "./confirm-dialog";
import { LogoPicker } from "./logo-picker";

export type TapDraft = Omit<Tap, "abv"> & { key: string; abv: string };

type TapEditorProps = {
  tap: TapDraft;
  index: number;
  total: number;
  onChange: (tap: TapDraft) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  libraryLogos?: string[];
  onLibraryAdd?: (logo: string) => void;
  onLibraryRemove?: (logo: string) => Promise<void> | void;
};

export function TapEditor({
  tap,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onError,
  libraryLogos = [],
  onLibraryAdd,
  onLibraryRemove,
}: TapEditorProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pickingLogo, setPickingLogo] = useState(false);

  async function uploadLogo(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/logos", { method: "POST", body });
    const payload = (await response.json()) as { logo?: string; error?: string };
    if (!response.ok || !payload.logo) {
      onError(payload.error ?? "Could not upload that logo.");
      return;
    }
    onLibraryAdd?.(payload.logo);
    onChange({ ...tap, logo: payload.logo });
    setPickingLogo(false);
  }

  return (
    <article className="w-52 shrink-0 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div
          className="flex items-center overflow-hidden rounded-full border border-stone-200"
          role="group"
          aria-label="Reorder tap"
        >
          <button
            type="button"
            className="px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:text-stone-300"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move left"
          >
            ←
          </button>
          <span className="min-w-0 border-x border-stone-200 px-2 py-1 text-xs font-medium tracking-[0.14em] text-stone-400 uppercase">
            {index + 1} of {total}
          </span>
          <button
            type="button"
            className="px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:text-stone-300"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move right"
          >
            →
          </button>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs tracking-[0.08em] text-stone-400 uppercase underline-offset-4 hover:text-red-700 hover:underline"
          onClick={() => setConfirmingRemove(true)}
        >
          Remove
        </button>
      </header>

      <button
        type="button"
        data-testid="tap-logo"
        aria-label="Choose logo"
        onClick={() => setPickingLogo(true)}
        className="relative mx-auto mb-4 block aspect-square w-[44%] min-w-24 max-w-36 overflow-hidden rounded-full border border-dashed border-stone-300 bg-stone-50 text-[11px] text-stone-400 hover:border-stone-400"
      >
        {tap.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/logos/${tap.logo.replace(/^logos\//, "")}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center">Logo</span>
        )}
      </button>

      <div data-testid="tap-fields" className="grid gap-3">
        <Field
          label="Name"
          value={tap.name}
          onChange={(name) => onChange({ ...tap, name })}
          placeholder="Helles"
        />
        <div className="grid grid-cols-[1fr_4.5rem] gap-3">
          <Field
            label="Style"
            value={tap.style}
            onChange={(style) => onChange({ ...tap, style })}
            placeholder="Lager"
          />
          <Field
            label="ABV"
            value={tap.abv}
            onChange={(abv) => onChange({ ...tap, abv })}
            placeholder="4.8"
            inputMode="decimal"
          />
        </div>
        <DescriptionField
          value={tap.description}
          onChange={(description) => onChange({ ...tap, description })}
        />
      </div>

      {pickingLogo ? (
        <LogoPicker
          current={tap.logo}
          logos={libraryLogos}
          onSelect={(logo) => {
            onChange(
              logo ? { ...tap, logo } : { ...tap, logo: undefined },
            );
            setPickingLogo(false);
          }}
          onUpload={uploadLogo}
          onDelete={async (logo) => {
            await onLibraryRemove?.(logo);
          }}
          onClose={() => setPickingLogo(false)}
        />
      ) : null}

      {confirmingRemove ? (
        <ConfirmDialog
          title={
            tap.name.trim()
              ? `Remove ${tap.name}?`
              : "Remove this tap?"
          }
          body="It will leave the board. You can add it again later."
          confirmLabel="Remove"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => {
            setConfirmingRemove(false);
            onRemove();
          }}
        />
      ) : null}
    </article>
  );
}

function DescriptionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] tracking-[0.12em] text-stone-400 uppercase">
        Description
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={focused ? 4 : 2}
        placeholder="Crisp and easy. The weeknight beer."
        className="w-full resize-none border-b border-stone-200 bg-transparent py-1 text-[15px] leading-snug text-stone-900 outline-none placeholder:text-stone-300 focus:border-stone-900"
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] tracking-[0.12em] text-stone-400 uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full border-b border-stone-200 bg-transparent py-1 text-[15px] text-stone-900 outline-none placeholder:text-stone-300 focus:border-stone-900"
      />
    </label>
  );
}
