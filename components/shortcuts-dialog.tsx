"use client";

import { useState, useEffect } from "react";
import { SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted text-xs font-mono font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("blockan:show-shortcuts", handler);
    return () => window.removeEventListener("blockan:show-shortcuts", handler);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm mx-4 bg-background rounded-2xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
              <Keyboard size={15} className="text-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys.join("+")} className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">Shortcuts are disabled when typing in inputs.</p>
        </div>
      </div>
    </div>
  );
}
