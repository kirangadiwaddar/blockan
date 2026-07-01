"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Issue } from "@/lib/types";
import { IssueCard } from "@/components/board/issue-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn, isCustomColor } from "@/lib/utils";

/* per-column accent colours */
const colTheme: Record<string, { bar: string; count: string; empty: string; colBg: string }> = {
  "Todo":        { bar: "bg-slate-400",   count: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",       empty: "border-slate-200 dark:border-slate-700",   colBg: "bg-slate-500/10 dark:bg-slate-500/10" },
  "In Progress": { bar: "bg-blue-500",    count: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",             empty: "border-blue-200 dark:border-blue-900",     colBg: "bg-blue-500/10 dark:bg-blue-500/10" },
  "Reviewing":   { bar: "bg-violet-500",  count: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",     empty: "border-violet-200 dark:border-violet-900", colBg: "bg-violet-500/10 dark:bg-violet-500/10" },
  "Completed":   { bar: "bg-emerald-500", count: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", empty: "border-emerald-200 dark:border-emerald-900", colBg: "bg-emerald-500/10 dark:bg-emerald-500/10" },
};

/* dot-class → subtle column background for custom columns */
const dotToBg: Record<string, string> = {
  "bg-muted-foreground": "bg-slate-500/10 dark:bg-slate-500/10",
  "bg-blue-500":         "bg-blue-500/10 dark:bg-blue-500/10",
  "bg-purple-500":       "bg-purple-500/10 dark:bg-purple-500/10",
  "bg-yellow-500":       "bg-yellow-500/10 dark:bg-yellow-500/10",
  "bg-red-500":          "bg-red-500/10 dark:bg-red-500/10",
  "bg-green-500":        "bg-green-500/10 dark:bg-green-500/10",
  "bg-orange-500":       "bg-orange-500/10 dark:bg-orange-500/10",
  "bg-pink-500":         "bg-pink-500/10 dark:bg-pink-500/10",
};

const fallback = { bar: "bg-muted-foreground", count: "bg-muted text-muted-foreground", empty: "border-border", colBg: "bg-muted/30 dark:bg-muted/10" };

interface Props {
  colId: string;
  label: string;
  dot: string;
  issues: Issue[];
  readOnly?: boolean;
  onAddIssue?: (colId: string) => void;
  onIssueClick?: (issue: Issue) => void;
  onDeleteIssue?: (id: string) => void;
}

export function KanbanColumn({ colId, label, dot, issues, readOnly, onAddIssue, onIssueClick, onDeleteIssue }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const builtinTheme = colTheme[colId];
  const custom = !builtinTheme && isCustomColor(dot);
  const colBg = builtinTheme?.colBg ?? (custom ? "" : dotToBg[dot] ?? fallback.colBg);
  const colBgStyle = custom && dot.startsWith("#") && dot.length === 7 ? { backgroundColor: `${dot}1a` } : undefined;
  const theme = builtinTheme ?? { ...fallback, bar: custom ? "" : (dot || fallback.bar) };
  const barStyle = custom ? { backgroundColor: dot } : undefined;

  return (
    <div className={cn("flex flex-col w-72 shrink-0 rounded-2xl border border-border/60 overflow-hidden shadow-xs", colBg)} style={colBgStyle}>

      {/* ── Column header ── */}
      <div className="px-3.5 pt-3.5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* coloured top-bar dot */}
          <span className={cn("size-2 rounded-full shrink-0", theme.bar)} style={barStyle} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className={cn("inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5 min-w-[20px] h-5", theme.count)}>
            {issues.length}
          </span>
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={() => onAddIssue?.(colId)}
          >
            <Plus size={14} />
          </Button>
        )}
      </div>

      {/* coloured top accent bar */}
      {/* <div className={cn("h-0.5 mx-3.5 rounded-full mb-3 opacity-60", theme.bar)} /> */}

      {/* ── Drop zone ── */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-3 flex-1 min-h-24 px-2.5 pb-2.5 transition-colors duration-150 rounded-2xl p-3 bg-white dark:bg-black/20",
          isOver && "bg-black/5 dark:bg-white/5",
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              readOnly={readOnly}
              onClick={onIssueClick}
              onDelete={onDeleteIssue}
            />
          ))}
          {issues.length === 0 && !readOnly && (
            <button
              onClick={() => onAddIssue?.(colId)}
              className={cn(
                "w-full flex flex-col items-center justify-center gap-1.5 py-8 rounded-xl border border-dashed text-muted-foreground hover:text-foreground transition-colors cursor-pointer mt-0.5",
                theme.empty,
              )}
            >
              <Plus size={13} />
              <span className="text-xs">Add issue</span>
            </button>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
