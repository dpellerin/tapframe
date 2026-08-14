"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

type LogoPickerProps = {
  current?: string;
  logos: string[];
  onSelect: (logo: string | undefined) => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (logo: string) => Promise<void>;
  onClose: () => void;
};

export function LogoPicker({
  current,
  logos,
  onSelect,
  onUpload,
  onDelete,
  onClose,
}: LogoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingDelete) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pendingDelete]);

  async function onFile(file: File | undefined) {
    if (!file) {
      return;
    }
    await onUpload(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/25 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-picker-title"
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-[#f7f4ee] p-6 shadow-lg"
      >
        <h2
          id="logo-picker-title"
          className="font-serif text-xl tracking-tight text-stone-900"
        >
          Choose a logo
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Pick one already on the board, or upload a new file.
        </p>

        {logos.length > 0 ? (
          <ul className="mt-5 grid grid-cols-4 gap-3">
            {logos.map((logo) => {
              const selected = logo === current;
              return (
                <li key={logo} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelect(logo)}
                    className={`aspect-square w-full overflow-hidden rounded-full border bg-white ${
                      selected
                        ? "border-stone-900 ring-2 ring-stone-900/20"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                    aria-label={`Use ${logo.replace(/^logos\//, "")}`}
                    aria-pressed={selected}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/logos/${logo.replace(/^logos\//, "")}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(logo)}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-[#f7f4ee] text-sm leading-none text-stone-500 hover:border-red-200 hover:text-red-700"
                    aria-label={`Delete ${logo.replace(/^logos\//, "")}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-stone-400">No logos uploaded yet.</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800"
            >
              Upload new
            </button>
            {current ? (
              <button
                type="button"
                onClick={() => onSelect(undefined)}
                className="text-sm text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline"
              >
                Use generic mark
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-white"
          >
            Cancel
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete this logo?"
          body="Taps using it will get the generic mark. You can upload the file again later."
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const logo = pendingDelete;
            setPendingDelete(null);
            void onDelete(logo);
          }}
        />
      ) : null}
    </div>
  );
}
