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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Bug, BookOpen, CheckSquare, Zap, Flame, AlertTriangle, TrendingDown, Minus, Search, Users } from "lucide-react";
import { Member } from "@/lib/types";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";


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
  readOnly?: boolean;
}

export function KanbanBoard({ initialIssues, members = [], projectId: propProjectId, activeSprintId, toolbarSlot, defaultOpenIssueId, readOnly }: Props) {
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
  const storageKey = projectId ? `board-columns-${projectId}` : "board-columns";
  const [columns, setColumns] = useState<BoardColumn[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: BoardColumn[] = JSON.parse(saved);
        // Merge: keep saved order/visibility, ensure all DEFAULT_COLUMNS builtins exist
        const builtinIds = new Set(DEFAULT_COLUMNS.map((c) => c.id));
        const savedIds = new Set(parsed.map((c) => c.id));
        const missing = DEFAULT_COLUMNS.filter((c) => !savedIds.has(c.id));
        return [...missing, ...parsed];
      }
    } catch {}
    return DEFAULT_COLUMNS;
  });

  const persistColumns = (cols: BoardColumn[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(cols)); } catch {}
  };

  const handleSetColumns = (cols: BoardColumn[]) => {
    setColumns(cols);
    persistColumns(cols);
  };
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [search, setSearch] = useState("");

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
    useSensor(PointerSensor, { activationConstraint: { distance: readOnly ? 999999 : 5 } })
  );

  const visibleColumns = columns.filter((c) => c.visible);
  const columnIds = visibleColumns.map((c) => c.id);
  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (q && !i.title.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q)) return false;
      if (filterMemberId && !i.assignees.some((a) => a.id === filterMemberId)) return false;
      if (filterPriority && i.priority !== filterPriority) return false;
      if (filterType && i.type !== filterType) return false;
      return true;
    });
  }, [issues, search, filterMemberId, filterPriority, filterType]);
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
      {/* ── Toolbar ── */}
      {(members.length > 0 || toolbarSlot) && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {toolbarSlot && <div className="min-w-0">{toolbarSlot}</div>}
          {/* Search */}
          <div className="relative w-48">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="pl-7 h-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={11} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {members.length > 0 && (
              <>
                {/* Assignee filter dropdown */}
                <DropdownMenu onOpenChange={(open) => { if (!open) setAssigneeSearch(""); }}>
                  <DropdownMenuTrigger
                    render={
                      <button className={cn(
                        "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                        filterMemberId
                          ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/30 text-primary dark:text-white"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      )}>
                        {filterMemberId ? (() => {
                          const m = members.find((m) => m.id === filterMemberId);
                          return m ? (
                            <span className="flex items-center gap-1.5">
                              <Avatar className="size-4">
                                <AvatarImage src={m.avatar} alt={m.name} />
                                <AvatarFallback className="text-[8px]" colorSeed={m.id}>{m.initials}</AvatarFallback>
                              </Avatar>
                              {m.name.split(" ")[0]}
                            </span>
                          ) : "Assignee";
                        })() : <><Users size={11} className="shrink-0" />Assignee</>}
                        <ChevronDown size={10} className="shrink-0" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" className="p-1 w-52">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
                      <Search size={12} className="text-muted-foreground shrink-0" />
                      <input
                        autoFocus
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Search assignee…"
                        className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {filterMemberId && (
                      <DropdownMenuItem onClick={() => setFilterMemberId(null)} className="gap-2 cursor-pointer text-muted-foreground">
                        <X size={12} /> Clear filter
                      </DropdownMenuItem>
                    )}
                    {members
                      .filter((m) => m.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      .map((m) => {
                        const active = filterMemberId === m.id;
                        return (
                          <DropdownMenuItem
                            key={m.id}
                            onClick={() => setFilterMemberId(active ? null : m.id)}
                            className={cn("gap-2 cursor-pointer", active && "bg-muted text-foreground")}
                          >
                            <Avatar className="size-6 shrink-0">
                              <AvatarImage src={m.avatar} alt={m.name} />
                              <AvatarFallback className="text-[9px]" colorSeed={m.id}>{m.initials}</AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-sm">{m.name}</span>
                            {active && <Check size={12} className="shrink-0" />}
                          </DropdownMenuItem>
                        );
                      })}
                    {members.filter((m) => m.name.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">No members found</div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* Priority filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className={cn(
                    "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                    filterPriority
                      ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/30 text-primary dark:text-white"
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
                    className={cn("gap-2 cursor-pointer", filterPriority === p && "bg-muted text-foreground")}
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
                      ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/30 text-primary dark:text-white"
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
                    className={cn("gap-2 cursor-pointer", filterType === value && "bg-muted text-foreground")}
                  >
                    <Icon size={12} className={cn("shrink-0", filterType === value ? "text-primary" : color)} />
                    {value}
                    {filterType === value && <Check size={11} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>


            {/* Manage columns — hidden for read-only roles */}
            {!readOnly && (
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
            )}
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
                readOnly={readOnly}
                onAddIssue={readOnly ? undefined : (id) => setCreateSheet({ open: true, status: id })}
                onIssueClick={(issue) => setDetailSheet({ open: true, issue })}
                onDeleteIssue={readOnly ? undefined : (id) => {
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
        onSave={handleSetColumns}
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
        readOnly={readOnly}
        onOpenChange={(open) => setDetailSheet((s) => ({ ...s, open }))}
        onUpdate={(updated) => {
          updateIssue(updated);
          setDetailSheet((s) => ({ ...s, issue: s.issue?.id === updated.id ? updated : s.issue }));
        }}
      />
    </>
  );
}
