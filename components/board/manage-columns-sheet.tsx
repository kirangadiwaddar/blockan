"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { GripVertical, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardColumn } from "@/components/board/kanban-board";

const DOT_COLORS = [
  { label: "Gray",   dot: "bg-muted-foreground" },
  { label: "Blue",   dot: "bg-blue-500" },
  { label: "Purple", dot: "bg-purple-500" },
  { label: "Yellow", dot: "bg-yellow-500" },
  { label: "Red",    dot: "bg-red-500" },
  { label: "Green",  dot: "bg-green-500" },
  { label: "Orange", dot: "bg-orange-500" },
  { label: "Pink",   dot: "bg-pink-500" },
];

interface Props {
  open: boolean;
  columns: BoardColumn[];
  onOpenChange: (open: boolean) => void;
  onSave: (columns: BoardColumn[]) => void;
}

export function ManageColumnsSheet({ open, columns, onOpenChange, onSave }: Props) {
  const [draft, setDraft] = useState<BoardColumn[]>(columns);
  const [newLabel, setNewLabel] = useState("");
  const [newDot, setNewDot] = useState("bg-muted-foreground");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleOpen = (val: boolean) => {
    if (val) setDraft(columns);
    onOpenChange(val);
  };

  const addColumn = () => {
    if (!newLabel.trim()) return;
    setDraft((prev) => [
      ...prev,
      { id: `col-${Date.now()}`, label: newLabel.trim(), dot: newDot, visible: true },
    ]);
    setNewLabel("");
    setNewDot("bg-muted-foreground");
  };

  const removeColumn = (id: string) =>
    setDraft((prev) => prev.filter((c) => c.id !== id));

  const toggleVisible = (id: string) =>
    setDraft((prev) => prev.map((c) => c.id === id ? { ...c, visible: !c.visible } : c));

  /* ── drag reorder ── */
  const onDragStart = (id: string) => setDraggingId(id);
  const onDragOver  = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const onDrop      = (targetId: string) => {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    setDraft((prev) => {
      const from = prev.findIndex((c) => c.id === draggingId);
      const to   = prev.findIndex((c) => c.id === targetId);
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-sm">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Manage Board Columns</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Drag to reorder. Toggle visibility or delete columns. Built-in columns can be hidden but not deleted.
          </p>

          {/* Column list */}
          <div className="flex flex-col gap-1">
            {draft.map((col) => (
              <div
                key={col.id}
                draggable
                onDragStart={() => onDragStart(col.id)}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDrop={() => onDrop(col.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-card transition-colors",
                  draggingId === col.id && "opacity-40",
                  dragOverId === col.id && draggingId !== col.id && "border-primary bg-muted/50",
                )}
              >
                <GripVertical size={14} className="text-muted-foreground cursor-grab shrink-0" />
                <span className={cn("size-2.5 rounded-full shrink-0", col.dot)} />
                <span className={cn("text-sm flex-1", !col.visible && "text-muted-foreground line-through")}>
                  {col.label}
                </span>
                <button
                  onClick={() => toggleVisible(col.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={col.visible ? "Hide column" : "Show column"}
                >
                  {col.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                {!col.builtin && (
                  <button
                    onClick={() => removeColumn(col.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Delete column"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Add column */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add column</p>
            <Input
              placeholder="Column name (e.g. Staging)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addColumn()}
            />
            <div className="flex flex-wrap gap-2">
              {DOT_COLORS.map((c) => (
                <button
                  key={c.dot}
                  onClick={() => setNewDot(c.dot)}
                  title={c.label}
                  className={cn(
                    "size-6 rounded-full cursor-pointer transition-all ring-offset-2",
                    c.dot,
                    newDot === c.dot && "ring-2 ring-foreground",
                  )}
                />
              ))}
            </div>
            <Button
              variant="outline"
              onClick={addColumn}
              disabled={!newLabel.trim()}
              className="w-full cursor-pointer"
            >
              <Plus size={14} /> Add column
            </Button>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={() => { onSave(draft); onOpenChange(false); }} className="cursor-pointer">
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
