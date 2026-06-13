"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshCtx {
  showRefreshNeeded: (reason?: string) => void;
}

const Ctx = createContext<RefreshCtx>({ showRefreshNeeded: () => {} });

export function useRefreshNeeded() {
  return useContext(Ctx);
}

export function RefreshNeededProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const showRefreshNeeded = useCallback((msg?: string) => {
    setReason(msg);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ showRefreshNeeded }}>
      {children}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-background border rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-base font-semibold leading-snug">Refresh needed</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {reason ?? "The page data is out of date. Refresh to see the latest changes."}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Dismiss
              </Button>
              <Button onClick={() => window.location.reload()} className="cursor-pointer gap-2">
                <RefreshCw size={13} />
                Refresh
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Ctx.Provider>
  );
}
