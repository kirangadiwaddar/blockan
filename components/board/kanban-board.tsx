"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useIssues } from "@/lib/issues-context";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Issue } from "@/lib/types";
import { KanbanColumn } from "@/components/board/kanban-column";
import { IssueCard } from "@/components/board/issue-card";
import { CreateIssueSheet } from "@/components/board/create-issue-sheet";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import { ManageColumnsSheet } from "@/components/board/manage-columns-sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Bug, BookOpen, CheckSquare, Zap, Flame, AlertTriangle, TrendingDown, Minus } from "lucide-react";
import { Member } from "@/lib/types";
import { Settings2, UserPlus, X } from "lucide-react";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { cn } from "@/lib/utils";

const LABEL_PALETTE = ["#6366f1","#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6","#f97316","#64748b"];
function labelColorFn(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}

/* ── Column type ─────────────────────────────────────────── */

export type BoardColumn = {
  id: string;
  label: string;
  dot: string;
  visible: boolean;
  builtin?: boolean;
};

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "Todo", label: "Todo", dot: "bg-muted-foreground", visible: true, builtin: true },
  { id: "In Progress", label: "In Progress", dot: "bg-blue-500", visible: true, builtin: true },
  { id: "Reviewing", label: "Reviewing", dot: "bg-purple-500", visible: true, builtin: true },
  { id: "Completed", label: "Completed", dot: "bg-green-500", visible: true, builtin: true },
];

interface Props {
  initialIssues: Issue[];
  members?: Member[];
  projectId?: string;
  activeSprintId?: string;
  toolbarSlot?: React.ReactNode;
  defaultOpenIssueId?: string;
}

export function KanbanBoard({ initialIssues, members = [], projectId: propProjectId, activeSprintId, toolbarSlot, defaultOpenIssueId }: Props) {
  const { issues: allIssues, updateIssue, addIssue: addToCtx, deleteIssue } = useIssues();
  const projectId = propProjectId ?? initialIssues[0]?.projectId;
  const issues = useMemo(
    () => projectId ? allIssues.filter((i) => i.projectId === projectId) : allIssues,
    [allIssues, projectId],
  );
  const setIssues = (fn: (prev: Issue[]) => Issue[]) => {
    const next = fn(issues);
    next.forEach((updated) => {
      const orig = issues.find((i) => i.id === updated.id);
      if (orig && (orig.status !== updated.status || JSON.stringify(orig) !== JSON.stringify(updated))) {
        updateIssue(updated);
      }
    });
  };
  const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_COLUMNS);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

  const [createSheet, setCreateSheet] = useState<{ open: boolean; status: string }>({
    open: false, status: "Todo",
  });
  const [detailSheet, setDetailSheet] = useState<{ open: boolean; issue: Issue | null }>({
    open: false, issue: null,
  });

  useEffect(() => {
    if (!defaultOpenIssueId) return;
    const issue = issues.find((i) => i.id === defaultOpenIssueId);
    if (issue) {
      setDetailSheet({ open: true, issue });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpenIssueId]);

  useEffect(() => {
    const openCreate = () => setCreateSheet({ open: true, status: "Todo" });
    window.addEventListener("blockan:create-issue", openCreate);
    return () => window.removeEventListener("blockan:create-issue", openCreate);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const visibleColumns = columns.filter((c) => c.visible);
  const columnIds = visibleColumns.map((c) => c.id);
  const filteredIssues = useMemo(
    () => issues.filter((i) => {
      if (filterMemberId && !i.assignees.some((a) => a.id === filterMemberId)) return false;
      if (filterPriority && i.priority !== filterPriority) return false;
      if (filterType && i.type !== filterType) return false;
      if (filterLabel && !(i.labels ?? []).includes(filterLabel)) return false;
      return true;
    }),
    [issues, filterMemberId, filterPriority, filterType],
  );
  const getByStatus = (id: string) => filteredIssues.filter((i) => i.status === id);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveIssue((e.active.data.current?.issue as Issue) ?? null);
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeItem = issues.find((i) => i.id === activeId);
    if (!activeItem) return;
    const overIsCol = columnIds.includes(overId);
    const targetStatus = overIsCol ? overId : (issues.find((i) => i.id === overId)?.status ?? activeItem.status);
    if (activeItem.status !== targetStatus) {
      setIssues((prev) => prev.map((i) => i.id === activeId ? { ...i, status: targetStatus } : i));
    }
  }, [issues, columnIds]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    setActiveIssue(null);
    if (!over || active.id === over.id) return;
    setIssues((prev) => {
      const from = prev.findIndex((i) => i.id === active.id);
      const to = prev.findIndex((i) => i.id === over.id);
      return to === -1 ? prev : arrayMove(prev, from, to);
    });
  }, []);

  return (
    <>
      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} projectId={projectId} />
      {/* ── Toolbar ── */}
      {(members.length > 0 || toolbarSlot) && (
        <div className="flex items-center gap-10 mb-3">
          {toolbarSlot && <div className="flex-1 min-w-0 max-w-2xl">{toolbarSlot}</div>}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {members.length > 0 && (
              <>
                {/* Clickable avatars — filter board by assignee */}
                <div className="flex items-center gap-2">
                  {/* Active filter pill */}
                  {filterMemberId && (() => {
                    const fm = members.find((m) => m.id === filterMemberId);
                    return fm ? (
                      <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full pl-1 pr-2 py-0.5">
                        <Avatar className="size-5">
                          <AvatarImage src={fm.avatar} alt={fm.name} />
                          <AvatarFallback className="text-[8px]">{fm.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-primary font-medium">{fm.name.split(" ")[0]}</span>
                        <button onClick={() => setFilterMemberId(null)} className="text-primary/60 hover:text-primary cursor-pointer ml-0.5">
                          <X size={11} />
                        </button>
                      </div>
                    ) : null;
                  })()}

                  {/* Avatar row — first 5 visible, rest in overflow dropdown */}
                  <div className="flex items-center">
                    {members.slice(0, 5).map((m) => {
                      const active = filterMemberId === m.id;
                      return (
                        <Tooltip key={m.id}>
                          <TooltipTrigger
                            render={
                              <button
                                onClick={() => setFilterMemberId(active ? null : m.id)}
                                className={cn(
                                  "-ml-1 first:ml-0 rounded-full transition-all cursor-pointer relative",
                                  active
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10"
                                    : filterMemberId
                                      ? "opacity-35 hover:opacity-80 hover:z-10"
                                      : "hover:ring-2 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background hover:z-10",
                                )}
                              >
                                <Avatar className="size-7">
                                  <AvatarImage src={m.avatar} alt={m.name} />
                                  <AvatarFallback className="text-xs">{m.initials}</AvatarFallback>
                                </Avatar>
                              </button>
                            }
                          />
                          <TooltipContent side="bottom" className="text-xs">
                            {active ? `Remove: ${m.name}` : `Filter: ${m.name}`}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {/* Overflow dropdown for extra members */}
                    {members.length > 5 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button className={cn(
                              "-ml-1 size-7 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer transition-all",
                              "bg-muted border border-border hover:bg-accent hover:z-10 relative",
                              members.slice(5).some((m) => m.id === filterMemberId) && "ring-2 ring-primary ring-offset-2 ring-offset-background z-10"
                            )}>
                              +{members.length - 5}
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end" className="p-1 w-52">
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">More members</div>
                          {members.slice(5).map((m) => {
                            const active = filterMemberId === m.id;
                            return (
                              <DropdownMenuItem
                                key={m.id}
                                onClick={() => setFilterMemberId(active ? null : m.id)}
                                className={cn("gap-2 cursor-pointer", active && "bg-primary/10 text-primary")}
                              >
                                <Avatar className="size-6 shrink-0">
                                  <AvatarImage src={m.avatar} alt={m.name} />
                                  <AvatarFallback className="text-[9px]">{m.initials}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate text-sm">{m.name}</span>
                                {active && <Check size={12} className="shrink-0" />}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteOpen(true)}
                  className="gap-1.5 cursor-pointer rounded-full h-9"
                >
                  <UserPlus size={13} /> Invite
                </Button>
              </>
            )}

            {/* Priority filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className={cn(
                    "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                    filterPriority
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}>
                    {filterPriority ?? "Priority"}
                    <ChevronDown size={10} className="shrink-0" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="p-1 w-40">
                {filterPriority && (
                  <DropdownMenuItem onClick={() => setFilterPriority(null)} className="gap-2 cursor-pointer text-muted-foreground">
                    <X size={12} /> Clear
                  </DropdownMenuItem>
                )}
                {["Critical", "High", "Medium", "Low"].map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                    className={cn("gap-2 cursor-pointer", filterPriority === p && "bg-primary/10 text-primary")}
                  >
                    {p === "Critical" && <Flame size={12} className="text-destructive shrink-0" />}
                    {p === "High"     && <AlertTriangle size={12} className="text-orange-500 shrink-0" />}
                    {p === "Medium"   && <Minus size={12} className="text-yellow-500 shrink-0" />}
                    {p === "Low"      && <TrendingDown size={12} className="text-muted-foreground shrink-0" />}
                    {p}
                    {filterPriority === p && <Check size={11} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className={cn(
                    "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                    filterType
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}>
                    {filterType ?? "Type"}
                    <ChevronDown size={10} className="shrink-0" />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="p-1 w-40">
                {filterType && (
                  <DropdownMenuItem onClick={() => setFilterType(null)} className="gap-2 cursor-pointer text-muted-foreground">
                    <X size={12} /> Clear
                  </DropdownMenuItem>
                )}
                {[
                  { value: "Bug",   icon: Bug,         color: "text-red-500"   },
                  { value: "Story", icon: BookOpen,    color: "text-blue-500"  },
                  { value: "Task",  icon: CheckSquare, color: "text-green-500" },
                  { value: "Epic",  icon: Zap,         color: "text-purple-500"},
                ].map(({ value, icon: Icon, color }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilterType(filterType === value ? null : value)}
                    className={cn("gap-2 cursor-pointer", filterType === value && "bg-primary/10 text-primary")}
                  >
                    <Icon size={12} className={cn("shrink-0", filterType === value ? "text-primary" : color)} />
                    {value}
                    {filterType === value && <Check size={11} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Label filter */}
            {(() => {
              const allLabels = [...new Set(issues.flatMap((i) => i.labels ?? []))];
              if (allLabels.length === 0) return null;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className={cn(
                        "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                        filterLabel
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}>
                        {filterLabel ?? "Label"}
                        <ChevronDown size={10} className="shrink-0" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="p-1 w-44">
                    {filterLabel && (
                      <DropdownMenuItem onClick={() => setFilterLabel(null)} className="gap-2 cursor-pointer text-muted-foreground">
                        <X size={12} /> Clear
                      </DropdownMenuItem>
                    )}
                    {allLabels.map((l) => (
                      <DropdownMenuItem
                        key={l}
                        onClick={() => setFilterLabel(filterLabel === l ? null : l)}
                        className={cn("gap-2 cursor-pointer", filterLabel === l && "bg-primary/10 text-primary")}
                      >
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: labelColorFn(l) }} />
                        <span className="truncate">{l}</span>
                        {filterLabel === l && <Check size={11} className="ml-auto shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}

            {/* Manage columns */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setManageOpen(true)}
                    className="size-8 cursor-pointer rounded-full"
                  >
                    <Settings2 size={13} />
                  </Button>
                }
              />
              <TooltipContent side="bottom">Manage columns</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* ── Board with horizontal scroll ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="w-full group/board">
          <div className="flex gap-4 pb-5 w-max">
            {visibleColumns.map((col) => (
              <KanbanColumn
                key={col.id}
                colId={col.id}
                label={col.label}
                dot={col.dot}
                issues={getByStatus(col.id)}
                onAddIssue={(id) => setCreateSheet({ open: true, status: id })}
                onIssueClick={(issue) => setDetailSheet({ open: true, issue })}
                onDeleteIssue={(id) => {
                  deleteIssue(id);
                  setDetailSheet((s) => s.issue?.id === id ? { open: false, issue: null } : s);
                }}
              />
            ))}
          </div>

          {/* scrollbar hidden by default, fades in on board hover */}
          <ScrollBar
            orientation="horizontal"
            className="opacity-0 group-hover/board:opacity-100 transition-opacity duration-200"
          />
        </ScrollArea>

        <DragOverlay>
          {activeIssue ? <IssueCard issue={activeIssue} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* ── Sheets ── */}
      <ManageColumnsSheet
        open={manageOpen}
        columns={columns}
        onOpenChange={setManageOpen}
        onSave={setColumns}
      />

      <CreateIssueSheet
        open={createSheet.open}
        defaultStatus={createSheet.status}
        projectId={projectId}
        defaultSprintId={activeSprintId}
        onOpenChange={(open) => setCreateSheet((s) => ({ ...s, open }))}
        onCreated={(issue) => {
          addToCtx(issue);
          setCreateSheet((s) => ({ ...s, open: false }));
        }}
      />

      <IssueDetailSheet
        issue={detailSheet.issue}
        open={detailSheet.open}
        onOpenChange={(open) => setDetailSheet((s) => ({ ...s, open }))}
        onUpdate={(updated) => {
          updateIssue(updated);
          setDetailSheet((s) => ({ ...s, issue: s.issue?.id === updated.id ? updated : s.issue }));
        }}
      />
    </>
  );
}
