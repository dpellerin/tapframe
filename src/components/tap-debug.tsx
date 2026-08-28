"use client";

import { useEffect, useRef } from "react";

export function TapDebug() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const events = ["touchstart", "touchend", "pointerdown", "click"] as const;
    const handlers = events.map((type) => {
      const handler = (event: Event) => {
        const el = ref.current;
        if (!el) {
          return;
        }
        const target =
          event.target instanceof Element
            ? `${event.target.tagName.toLowerCase()}${
                event.target.className
                  ? `.${event.target.className.toString().slice(0, 30)}`
                  : ""
              }`
            : "other";
        el.textContent = `${type} → ${target}`;
      };
      document.addEventListener(type, handler, { capture: true });
      return [type, handler] as const;
    });
    return () => {
      for (const [type, handler] of handlers) {
        document.removeEventListener(type, handler, { capture: true });
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 9999,
        background: "#000",
        color: "#0f0",
        font: "11px/1.4 monospace",
        padding: "4px 8px",
        borderRadius: 6,
        maxWidth: "80vw",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    />
  );
}
