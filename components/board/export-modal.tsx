"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const ALL_COLUMNS = [
  { key: "Todo",        label: "Todo",        dot: "bg-muted-foreground" },
  { key: "In Progress", label: "In Progress", dot: "bg-blue-500" },
  { key: "Reviewing",   label: "Reviewing",   dot: "bg-purple-500" },
  { key: "Completed",   label: "Completed",   dot: "bg-green-500" },
];

interface Props {
  open: boolean;
  defaultName: string;
  issueCount: number;
  mode: "xlsx" | "sheets";
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onExport: (filename: string, columns: string[]) => void;
}

export function ExportModal({
  open, defaultName, issueCount, mode, loading, error, onClose, onExport,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [selected, setSelected] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

  if (!open) return null;

  const toggleCol = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const allSelected = selected.length === ALL_COLUMNS.length;
  const toggleAll = () =>
    setSelected(allSelected ? [] : ALL_COLUMNS.map((c) => c.key));

  const handle = () => {
    if (!name.trim() || selected.length === 0) return;
    onExport(name.trim(), selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-background border rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b">
          <p className="text-base font-semibold">
            {mode === "xlsx" ? "Download Excel" : "Add to Google Sheets"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select which board columns to include · {issueCount} total issues
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Filename */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium">
              {mode === "xlsx" ? "File name" : "Spreadsheet name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-lg border bg-muted/30 px-3 text-sm outline-none focus:ring-1 focus:ring-ring w-full"
              placeholder="Enter name…"
            />
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Columns</label>
              <button
                onClick={toggleAll}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {ALL_COLUMNS.map((col) => {
                const active = selected.includes(col.key);
                return (
                  <button
                    key={col.key}
                    onClick={() => toggleCol(col.key)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors cursor-pointer",
                      active
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <span className={cn("size-2 rounded-full shrink-0", col.dot)} />
                    <span className="flex-1">{col.label}</span>
                    {active && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handle}
            disabled={loading || !name.trim() || selected.length === 0}
          >
            {loading ? "Exporting…" : mode === "xlsx" ? "Download" : "Add to Sheets"}
          </Button>
        </div>
      </div>
    </div>
  );
}
