"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  title: string;
  body?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/25 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-[#f7f4ee] p-6 shadow-lg"
      >
        <h2
          id="confirm-dialog-title"
          className="font-serif text-xl tracking-tight text-stone-900"
        >
          {title}
        </h2>
        {body ? <p className="mt-2 text-sm text-stone-500">{body}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-800"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
