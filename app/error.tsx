"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={26} className="text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. You can try refreshing, or go back to the dashboard.
          </p>
          {error?.digest && (
            <p className="text-xs text-muted-foreground font-mono mt-1 opacity-60">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 cursor-pointer" onClick={() => window.history.back()}>
            <ArrowLeft size={14} /> Go back
          </Button>
          <Button className="gap-2 cursor-pointer" onClick={reset}>
            <RefreshCw size={14} /> Try again
          </Button>
        </div>
        <a href="/dashboard" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
          Return to dashboard
        </a>
      </div>
    </div>
  );
}
