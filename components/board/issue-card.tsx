"use client";

import { useState } from "react";
import { Issue } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bug, BookOpen, CheckSquare, Zap, CalendarDays, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcon = { Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap };
const typeColor = {
  Bug: "text-red-500", Story: "text-blue-500",
  Task: "text-green-500", Epic: "text-purple-500",
};
const priorityClass = {
  Critical: "destructive" as const,
  High: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400",
  Medium: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
  Low: "secondary" as const,
};

const MAX_AVATARS = 3;

const LABEL_COLORS = [
  "#6366f1","#3b82f6","#22c55e","#f59e0b",
  "#ef4444","#a855f7","#ec4899","#14b8a6","#f97316","#64748b",
];
function labelColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

interface Props {
  issue: Issue;
  overlay?: boolean;
  onClick?: (issue: Issue) => void;
  onDelete?: (id: string) => void;
}

export function IssueCard({ issue, overlay, onClick, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id, data: { issue } });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const style = { transform: CSS.Transform.toString(transform), transition };
  const TypeIcon = typeIcon[issue.type];
  const priorityCfg = priorityClass[issue.priority];
  const isVariant = priorityCfg === "destructive" || priorityCfg === "secondary";
  const extra = issue.assignees.length - MAX_AVATARS;

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete issue?"
        description={`"${issue.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { setConfirmOpen(false); onDelete?.(issue.id); }}
        onCancel={() => setConfirmOpen(false)}
      />
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn("group/card relative", isDragging && !overlay && "opacity-40")}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick?.(issue);
      }}
    >
      <Card className={cn(
        "rounded-xl cursor-grab active:cursor-grabbing select-none bg-card shadow-xs hover:shadow-sm transition-shadow",
        overlay && "rotate-2 shadow-lg",
      )}>
        <CardContent className="px-3.5 flex flex-col gap-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <TypeIcon size={12} className={typeColor[issue.type]} />
              <span className="text-xs text-muted-foreground font-mono">{issue.code}</span>
            </div>
              {isVariant ? (
                <Badge variant={priorityCfg as "destructive" | "secondary"} className="text-xs font-normal">
                  {issue.priority}
                </Badge>
              ) : (
                <Badge className={cn("text-xs font-normal", priorityCfg)}>
                  {issue.priority}
                </Badge>
              )}
              </div>

              {/* ··· menu — stop propagation so card click doesn't fire */}
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className=" transition-opacity p-0.5 rounded hover:bg-muted cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={13} className="text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-sm"
                      onClick={(e) => { e.stopPropagation(); onClick?.(issue); }}
                    >
                      <Pencil size={13} /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer gap-2 text-sm"
                      onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
                    >
                      <Trash2 size={13} /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
          </div>

          <p className="text-sm font-medium text-card-foreground leading-snug flex-1 line-clamp-2">
              {issue.title}
            </p>

          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 text-white"
                  style={{ backgroundColor: labelColor(l) }}
                >
                  {l}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {issue.dueDate && (() => {
                const due = new Date(issue.dueDate);
                due.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const overdue = due < today && issue.status !== "Completed" && issue.status !== "Cancelled";
                return (
                  <div className={cn("flex items-center gap-1", overdue ? "text-red-500" : "text-muted-foreground")}>
                    {overdue
                      ? <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                      : <CalendarDays size={10} />}
                    <span className="text-xs font-medium">
                      {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })()}
              {issue.storyPoints && (
                <span className="text-xs text-muted-foreground">{issue.storyPoints}pt</span>
              )}
            </div>

            {issue.assignees.length === 1 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Avatar className="size-7 ring-2 ring-background">
                  <AvatarImage src={issue.assignees[0].avatar} alt={issue.assignees[0].name} />
                  <AvatarFallback className="text-xs">{issue.assignees[0].initials}</AvatarFallback>
                </Avatar>
              </div>
            )}
            {issue.assignees.length > 1 && (
              <AvatarGroup className="shrink-0">
                {issue.assignees.slice(0, MAX_AVATARS).map((a) => (
                  <Avatar key={a.id} className="size-7 ring-2 ring-background">
                    <AvatarImage src={a.avatar} alt={a.name} />
                    <AvatarFallback className="text-xs">{a.initials}</AvatarFallback>
                  </Avatar>
                ))}
                {extra > 0 && (
                  <AvatarGroupCount className="size-7 text-xs">+{extra}</AvatarGroupCount>
                )}
              </AvatarGroup>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
