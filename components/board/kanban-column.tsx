"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Issue } from "@/lib/types";
import { IssueCard } from "@/components/board/issue-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* per-column accent colours */
const colTheme: Record<string, { bar: string; count: string; empty: string }> = {
  "Todo":        { bar: "bg-slate-400",   count: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",   empty: "border-slate-200 dark:border-slate-700" },
  "In Progress": { bar: "bg-blue-500",    count: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",         empty: "border-blue-200 dark:border-blue-900" },
  "Reviewing":   { bar: "bg-violet-500",  count: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400", empty: "border-violet-200 dark:border-violet-900" },
  "Completed":   { bar: "bg-emerald-500", count: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", empty: "border-emerald-200 dark:border-emerald-900" },
};

const fallback = { bar: "bg-muted-foreground", count: "bg-muted text-muted-foreground", empty: "border-border" };

interface Props {
  colId: string;
  label: string;
  dot: string;
  issues: Issue[];
  onAddIssue?: (colId: string) => void;
  onIssueClick?: (issue: Issue) => void;
  onDeleteIssue?: (id: string) => void;
}

export function KanbanColumn({ colId, label, dot, issues, onAddIssue, onIssueClick, onDeleteIssue }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  const theme = colTheme[colId] ?? fallback;

  return (
    <div className="flex flex-col w-72 shrink-0 rounded-2xl border border-border/60 bg-muted/30 dark:bg-muted/10 overflow-hidden shadow-xs">

      {/* ── Column header ── */}
      <div className="px-3.5 pt-3.5 pb-3 flex items-center justify-between pb-5">
        <div className="flex items-center gap-2">
          {/* coloured top-bar dot */}
          <span className={cn("size-2 rounded-full shrink-0", colTheme[colId] ? theme.bar : dot)} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className={cn("inline-flex items-center justify-center rounded-full text-[11px] font-semibold px-1.5 min-w-[20px] h-5", theme.count)}>
            {issues.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => onAddIssue?.(colId)}
        >
          <Plus size={14} />
        </Button>
      </div>

      {/* coloured top accent bar */}
      {/* <div className={cn("h-0.5 mx-3.5 rounded-full mb-3 opacity-60", theme.bar)} /> */}

      {/* ── Drop zone ── */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-3 flex-1 min-h-24 px-2.5 pb-2.5 transition-colors duration-150 rounded-2xl p-3 bg-background/60 dark:bg-muted/5",
          isOver && "bg-muted/60 dark:bg-muted/30",
        )}
      >
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={onIssueClick}
              onDelete={onDeleteIssue}
            />
          ))}
          {issues.length === 0 && (
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
