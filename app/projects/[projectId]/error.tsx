"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[project error boundary]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={22} className="text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Failed to load this page</h2>
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading this project view. Try again, or go back to the board.
          </p>
          {error?.digest && (
            <p className="text-xs text-muted-foreground font-mono mt-1 opacity-60">
              ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => window.history.back()}>
            <ArrowLeft size={13} /> Back
          </Button>
          <Button size="sm" className="gap-2 cursor-pointer" onClick={reset}>
            <RefreshCw size={13} /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
