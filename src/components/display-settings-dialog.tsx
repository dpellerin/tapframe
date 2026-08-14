"use client";

import { useEffect, useState } from "react";
import { DEFAULT_BOARD_LAYOUT } from "@/lib/display/layout";
import type { DisplayManifest, DisplaySettings } from "@/lib/display/types";

type DisplaySettingsDialogProps = {
  initial: DisplaySettings;
  displays: DisplayManifest[];
  onCancel: () => void;
  onSave: (next: DisplaySettings) => Promise<boolean>;
};

const CONTROL =
  "h-8 w-full border-b border-stone-200 bg-transparent text-[15px] leading-8 text-stone-900 outline-none";

export function DisplaySettingsDialog({
  initial,
  displays,
  onCancel,
  onSave,
}: DisplaySettingsDialogProps) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active =
    displays.find((item) => item.id === draft.adapter) ?? displays[0];
  const size =
    active?.sizes.find((item) => item.id === draft.size) ?? active?.sizes[0];
  const layout = active?.layout ?? DEFAULT_BOARD_LAYOUT;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  async function save() {
    if (!active || !size) {
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSave({
      adapter: active.id,
      size: size.id,
      fields: draft.fields,
    });
    setSaving(false);
    if (!ok) {
      setError("Could not save display settings.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/25 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-settings-title"
        className="w-fit max-w-full rounded-2xl border border-stone-200 bg-[#f7f4ee] p-6 shadow-lg"
      >
        <h2
          id="display-settings-title"
          className="font-serif text-xl tracking-tight text-stone-900"
        >
          Display
        </h2>
        {error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {active ? (
          <div className="mt-5 grid grid-cols-[7.5rem_14rem] items-center gap-x-4 gap-y-3">
            <label className="contents">
              <span className="text-[11px] tracking-[0.16em] text-stone-400 uppercase">
                Display
              </span>
              <select
                value={active.id}
                onChange={(event) => {
                  const next = displays.find(
                    (item) => item.id === event.target.value,
                  );
                  setDraft({
                    adapter: event.target.value,
                    size: next?.sizes[0]?.id ?? draft.size,
                    fields: draft.fields,
                  });
                }}
                className={CONTROL}
              >
                {displays.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="contents">
              <span className="text-[11px] tracking-[0.16em] text-stone-400 uppercase">
                Size
              </span>
              <select
                value={size?.id ?? ""}
                onChange={(event) => {
                  setDraft({ ...draft, size: event.target.value });
                }}
                className={CONTROL}
              >
                {active.sizes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="contents">
              <span className="text-[11px] tracking-[0.16em] text-stone-400 uppercase">
                Board
              </span>
              <p className={CONTROL}>
                {layout.maxPerRow} across · {layout.rows}{" "}
                {layout.rows === 1 ? "row" : "rows"}
              </p>
            </div>
            {active.fields.map((field) => (
              <label key={field.key} className="contents">
                <span className="text-[11px] tracking-[0.16em] text-stone-400 uppercase">
                  {field.label}
                </span>
                <input
                  type={field.type === "password" ? "password" : "text"}
                  value={draft.fields[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => {
                    setDraft({
                      ...draft,
                      fields: {
                        ...draft.fields,
                        [field.key]: event.target.value,
                      },
                    });
                  }}
                  className={`${CONTROL} placeholder:text-stone-300`}
                />
              </label>
            ))}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
