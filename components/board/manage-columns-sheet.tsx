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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn, isCustomColor } from "@/lib/utils";
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
    const label = newLabel.trim();
    setDraft((prev) => [
      ...prev,
      { id: `col-${Date.now()}`, label, dot: newDot, visible: true },
    ]);
    setNewLabel("");
    setNewDot("bg-muted-foreground");
    toast.success(`Column "${label}" added`, { description: "Save changes to apply it to the board." });
  };

  const handleSave = () => {
    // Flush any pending column name that wasn't explicitly "added" yet
    let next = draft;
    if (newLabel.trim()) {
      next = [
        ...draft,
        { id: `col-${Date.now()}`, label: newLabel.trim(), dot: newDot, visible: true },
      ];
      setNewLabel("");
      setNewDot("bg-muted-foreground");
    }
    onSave(next);
    toast.success("Board columns updated");
    onOpenChange(false);
  };

  const removeColumn = (id: string) =>
    setDraft((prev) => prev.filter((c) => c.id !== id));

  const toggleVisible = (id: string) =>
    setDraft((prev) => prev.map((c) => c.id === id ? { ...c, visible: !c.visible } : c));

  const updateColumn = (id: string, patch: Partial<BoardColumn>) =>
    setDraft((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));

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
        <SheetHeader className="px-6 py-3.5 border-b">
          <SheetTitle>Manage Board Columns</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Drag to reorder. Rename any column, change its color, toggle visibility, or delete. Built-in columns can be renamed and hidden but not deleted.
          </p>

          {/* Column list */}
          <div className="flex flex-col gap-2.5">
            {draft.map((col) => (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDrop={() => onDrop(col.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border bg-card transition-colors",
                  draggingId === col.id && "opacity-40",
                  dragOverId === col.id && draggingId !== col.id && "border-primary bg-muted/50",
                )}
              >
                <span
                  draggable
                  onDragStart={() => onDragStart(col.id)}
                  className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                  title="Drag to reorder"
                >
                  <GripVertical size={14} />
                </span>

                {/* Color picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        title="Change color"
                        style={isCustomColor(col.dot) ? { backgroundColor: col.dot } : undefined}
                        className={cn(
                          "size-3.5 rounded-full shrink-0 cursor-pointer ring-offset-2 ring-offset-card transition-all hover:ring-2 hover:ring-border",
                          !isCustomColor(col.dot) && col.dot,
                        )}
                      />
                    }
                  />
                  <DropdownMenuContent className="p-2 w-auto">
                    <div className="grid grid-cols-4 gap-2">
                      {DOT_COLORS.map((c) => (
                        <button
                          key={c.dot}
                          onClick={() => updateColumn(col.id, { dot: c.dot })}
                          title={c.label}
                          className={cn(
                            "size-6 rounded-full cursor-pointer ring-offset-2 ring-offset-popover transition-all",
                            c.dot,
                            col.dot === c.dot && "ring-2 ring-foreground",
                          )}
                        />
                      ))}
                    </div>
                    <ColorInputRow
                      value={col.dot}
                      onChange={(hex) => updateColumn(col.id, { dot: hex })}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Editable name */}
                <input
                  value={col.label}
                  onChange={(e) => updateColumn(col.id, { label: e.target.value })}
                  placeholder="Column name"
                  className={cn(
                    "flex-1 min-w-0 bg-transparent text-sm outline-none rounded-md px-2 py-1 transition-colors hover:bg-muted/50 focus:bg-muted/60 focus:ring-1 focus:ring-border",
                    !col.visible && "text-muted-foreground line-through",
                  )}
                />

                <button
                  onClick={() => toggleVisible(col.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                  title={col.visible ? "Hide column" : "Show column"}
                >
                  {col.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                {!col.builtin && (
                  <button
                    onClick={() => removeColumn(col.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
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
            <div className="flex gap-3 items-center">
              {/* Color picker — single swatch */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      title="Pick color"
                      style={isCustomColor(newDot) ? { backgroundColor: newDot } : undefined}
                      className={cn(
                        "size-5 rounded-full shrink-0 cursor-pointer ring-offset-2 ring-offset-background transition-all hover:ring-2 hover:ring-border",
                        !isCustomColor(newDot) && newDot,
                      )}
                    />
                  }
                />
                <DropdownMenuContent className="p-2 w-auto">
                  <div className="grid grid-cols-4 gap-2">
                    {DOT_COLORS.map((c) => (
                      <button
                        key={c.dot}
                        onClick={() => setNewDot(c.dot)}
                        title={c.label}
                        className={cn(
                          "size-6 rounded-full cursor-pointer ring-offset-2 ring-offset-popover transition-all",
                          c.dot,
                          newDot === c.dot && "ring-2 ring-foreground",
                        )}
                      />
                    ))}
                  </div>
                  <ColorInputRow value={newDot} onChange={setNewDot} />
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                placeholder="Column name (e.g. Staging)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
                className="flex-1"
              />
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

        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSave} className="cursor-pointer">
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ── Custom color input — native picker, works alongside predefined swatches ── */
function ColorInputRow({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const current = isCustomColor(value) && value.startsWith("#") ? value : "#8b5cf6";
  return (
    <div className="mt-2 pt-2 border-t flex items-center gap-2">
      <label
        className={cn(
          "relative size-6 rounded-full cursor-pointer overflow-hidden border border-border ring-offset-2 ring-offset-popover",
          isCustomColor(value) && "ring-2 ring-foreground",
        )}
        title="Custom color"
      >
        <span
          className="absolute inset-0"
          style={{ background: "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)" }}
        />
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <span className="text-xs text-muted-foreground">Custom</span>
    </div>
  );
}
