"use client";

import { useState, useEffect } from "react";
import { fetchProjectLabels, upsertProjectLabel, type ProjectLabel } from "@/lib/supabase/db";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tag, Plus, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#a855f7", "#ec4899", "#14b8a6",
  "#f97316", "#64748b",
];

interface Props {
  projectId: string;
  selected: string[];
  onChange: (labels: string[]) => void;
}

export function LabelPicker({ projectId, selected, onChange }: Props) {
  const [labels, setLabels] = useState<ProjectLabel[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectLabels(projectId).then(setLabels).catch(() => {});
    }
  }, [projectId]);

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((l) => l !== name) : [...selected, name]);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const label = await upsertProjectLabel({ projectId, name: newName.trim(), color: newColor });
    if (label) {
      setLabels((prev) => [...prev.filter((l) => l.name !== label.name), label].sort((a, b) => a.name.localeCompare(b.name)));
      toggle(label.name);
    }
    setNewName("");
    setCreating(false);
    setSaving(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted cursor-pointer text-sm transition-colors w-full group/sel">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm">No labels</span>
            ) : (
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                {selected.map((l) => {
                  const def = labels.find((lb) => lb.name === l);
                  return (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium text-white"
                      style={{ backgroundColor: def?.color ?? "#6366f1" }}
                    >
                      {l}
                    </span>
                  );
                })}
              </div>
            )}
            <Tag size={11} className="text-muted-foreground/50 ml-auto shrink-0" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="p-2 w-56" sideOffset={4}>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1 mb-1">Labels</p>

        {labels.length === 0 && !creating && (
          <p className="text-xs text-muted-foreground px-2 py-1.5">No labels yet. Create one below.</p>
        )}

        {labels.map((label) => {
          const active = selected.includes(label.name);
          return (
            <button
              key={label.id}
              onClick={() => toggle(label.name)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors text-left",
                active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 truncate">{label.name}</span>
              {active && <Check size={11} className="text-primary shrink-0" />}
            </button>
          );
        })}

        {/* Create new label */}
        {creating ? (
          <div className="mt-1.5 flex flex-col gap-2 border-t pt-2">
            <input
              autoFocus
              placeholder="Label name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
              className="h-7 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "size-5 rounded-full cursor-pointer border-2 transition-all",
                    newColor === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="flex-1 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium cursor-pointer hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(""); }}
                className="flex-1 h-7 rounded-lg bg-muted text-xs font-medium cursor-pointer hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground cursor-pointer hover:bg-muted/60 transition-colors mt-1 border-t pt-2"
          >
            <Plus size={11} /> New label
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
