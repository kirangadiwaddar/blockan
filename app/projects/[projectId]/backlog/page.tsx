"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useIssues } from "@/lib/issues-context";
import { useProjects, useProjectRole, canEditProject } from "@/lib/projects-context";
import { Issue, IssuePriority, IssueType } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronRight, Plus, CalendarDays,
  SquareStack, ChevronDown, ListTree, Trash2, MoreHorizontal,
  Search, X, Users, Flame, AlertTriangle, Minus, TrendingDown, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { CreateIssueSheet } from "@/components/board/create-issue-sheet";

/* ─── Config ──────────────────────────────────────────────── */

const priorityVariant: Record<IssuePriority, { variant?: "destructive" | "secondary" | "outline"; className?: string }> = {
  Critical: { variant: "destructive" },
  High:     { className: "bg-orange-50 text-orange-500 dark:bg-orange-950 dark:text-orange-400" },
  Medium:   { className: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" },
  Low:      { variant: "secondary" },
};

const statusDot: Record<string, string> = {
  "Todo":        "bg-muted-foreground",
  "In Progress": "bg-blue-500",
  "Reviewing":   "bg-purple-500",
  "Completed":   "bg-green-500",
};

const typeIcon: Record<IssueType, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};

const typeColor: Record<IssueType, string> = {
  Bug: "text-red-500", Story: "text-blue-500",
  Task: "text-green-500", Epic: "text-purple-500",
};

/* ─── Priority badge helper ───────────────────────────────── */

function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const cfg = priorityVariant[priority];
  if (cfg.variant) {
    return <Badge variant={cfg.variant} className="font-normal">{priority}</Badge>;
  }
  return <Badge className={cn("font-normal", cfg.className)}>{priority}</Badge>;
}

/* ─── Sprint group ────────────────────────────────────────── */

function SprintGroup({
  label,
  issues,
  selectedIds,
  onSelect,
  onIssueClick,
  onAddIssue,
  onDeleteIssue,
  defaultOpen,
  headerBadge,
}: {
  label: string;
  issues: Issue[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onIssueClick: (issue: Issue) => void;
  onAddIssue?: () => void;
  onDeleteIssue?: (issue: Issue) => void;
  defaultOpen: boolean;
  headerBadge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const done = issues.filter((i) => i.status === "Done").length;
  const pts  = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

  return (
    <Card className="rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="border-b">
          <CollapsibleTrigger className="w-full text-left cursor-pointer">
            <div className="flex items-center gap-2">
              <ChevronRight
                size={14}
                className={cn("text-muted-foreground transition-transform duration-150 shrink-0", open && "rotate-90")}
              />
              <CardTitle>{label}</CardTitle>
              <Badge variant="outline" className="font-normal">{issues.length}</Badge>
              {done > 0 && (
                <span className="text-xs text-muted-foreground">{done}/{issues.length} done</span>
              )}
              {headerBadge}
            </div>
          </CollapsibleTrigger>
          <CardAction>
            <div className="flex items-center gap-3">
              {pts > 0 && (
                <span className="text-xs text-muted-foreground">{pts} pts</span>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 cursor-pointer h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onAddIssue?.(); }}
              >
                <Plus size={12} /> Create issue
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 ps-4">
                    <Checkbox
                      checked={issues.length > 0 && issues.every((i) => selectedIds.has(i.id))}
                      onCheckedChange={(checked) =>
                        issues.forEach((i) => {
                          const already = selectedIds.has(i.id);
                          if (checked && !already) onSelect(i.id);
                          if (!checked && already) onSelect(i.id);
                        })
                      }
                    />
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Priority</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Due date</TableHead>
                  <TableHead className="w-14 hidden sm:table-cell">Pts</TableHead>
                  <TableHead className="w-24">Assignees</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <EmptyState
                        icon={ListTree}
                        title="No issues in this sprint"
                        description="Create an issue below or drag one from the backlog."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                )}
                {issues.map((issue) => {
                  const TypeIcon = typeIcon[issue.type];
                  return (
                    <TableRow
                      key={issue.id}
                      className="cursor-pointer group/row"
                      onClick={() => onIssueClick(issue)}
                    >
                      <TableCell className="ps-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(issue.id)}
                          onCheckedChange={() => onSelect(issue.id)}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <TypeIcon size={13} className={typeColor[issue.type]} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{issue.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{issue.title}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("inline-block size-2 rounded-full shrink-0", statusDot[issue.status])} />
                          <span className="text-sm text-muted-foreground">{issue.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={issue.priority} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {issue.dueDate ? (
                          <div className="flex items-center gap-1">
                            <CalendarDays size={11} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(issue.dueDate).toLocaleDateString("en-US", {
                                month: "short", day: "numeric",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {issue.storyPoints ? `${issue.storyPoints}pt` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AvatarGroup>
                          {issue.assignees.slice(0, 3).map((a) => (
                            <Avatar key={a.id} className="size-7 ring-2 ring-background dark:ring-muted">
                              <AvatarImage src={a.avatar} alt={a.name} />
                              <AvatarFallback className="text-xs" colorSeed={a.id}>{a.initials}</AvatarFallback>
                            </Avatar>
                          ))}
                          {issue.assignees.length > 3 && (
                            <AvatarGroupCount className="size-7 text-xs">+{issue.assignees.length - 3}</AvatarGroupCount>
                          )}
                        </AvatarGroup>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {onDeleteIssue && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center size-7 rounded-md hover:bg-muted transition-colors cursor-pointer">
                              <MoreHorizontal size={14} className="text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer gap-2"
                                onClick={() => onDeleteIssue(issue)}
                              >
                                <Trash2 size={13} /> Delete issue
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

function BacklogPageInner({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { sprintsForProject, projectBySlug, loading: projectsLoading } = useProjects();
  const project        = projectBySlug(projectId);
  const projectSprints = sprintsForProject(project?.id ?? projectId);
  const role           = useProjectRole(projectId);
  const readOnly       = !canEditProject(role);
  const { issues: allCtxIssues, updateIssue, addIssue, deleteIssue, loading: issuesLoading } = useIssues();
  const issueList = useMemo(
    () => allCtxIssues.filter((i) => i.projectId === project?.id),
    [allCtxIssues, project?.id],
  );
  const searchParams   = useSearchParams();
  const issueIdParam   = searchParams?.get("issue") ?? null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen]   = useState(false);
  const [search, setSearch]           = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterType, setFilterType]         = useState<string | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  useEffect(() => {
    if (!issueIdParam || issueList.length === 0) return;
    const found = issueList.find((i) => i.id === issueIdParam);
    if (found) {
      setDetailIssue(found);
      setDetailOpen(true);
    }
  }, [issueIdParam, issueList]);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("blockan:create-issue", openCreate);
    return () => window.removeEventListener("blockan:create-issue", openCreate);
  }, []);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openDetail  = (issue: Issue) => { setDetailIssue(issue); setDetailOpen(true); };

  const members = project?.members ?? [];
  const activeFilterCount = [filterPriority, filterType, filterMemberId].filter(Boolean).length;

  const backlogIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issueList.filter((i) => {
      if (i.sprintId) return false;
      if (q && !i.title.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q)) return false;
      if (filterPriority && i.priority !== filterPriority) return false;
      if (filterType && i.type !== filterType) return false;
      if (filterMemberId && !i.assignees.some((a) => a.id === filterMemberId)) return false;
      return true;
    });
  }, [issueList, search, filterPriority, filterType, filterMemberId]);

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-5 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 px-5 py-3 border-b last:border-0">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20 hidden md:block" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </AppSidebar>
    );
  }

  if (!project) {
    return (
      <AppSidebar>
        <NotFoundBlock />
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <CreateIssueSheet
        open={createOpen}
        defaultStatus="Todo"
        projectId={project.id}
        onOpenChange={setCreateOpen}
        onCreated={addIssue}
      />
      <div className="flex flex-col gap-5 p-6 w-full">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`avatar-orb ${project.color} size-7 rounded-full shrink-0`} />
            <h1 className="text-xl font-semibold truncate">{project.name} — Backlog</h1>
          </div>
          <Link
            href={`/projects/${project.id}/board`}
            className={buttonVariants({ variant: "outline", className: "cursor-pointer w-full sm:w-auto justify-center" })}
          >
            <SquareStack size={14} /> Board view
          </Link>
        </div>

        {/* ── Search + filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues…"
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Assignee */}
          {members.length > 0 && (
            <DropdownMenu onOpenChange={(open) => { if (!open) setAssigneeSearch(""); }}>
              <DropdownMenuTrigger render={
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
              } />
              <DropdownMenuContent align="start" className="p-1 w-52">
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
          )}

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className={cn(
                "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                filterPriority
                  ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/30 text-primary dark:text-white"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}>
                {filterPriority ?? "Priority"}
                <ChevronDown size={10} className="shrink-0" />
              </button>
            } />
            <DropdownMenuContent align="start" className="p-1 w-40">
              {filterPriority && (
                <DropdownMenuItem onClick={() => setFilterPriority(null)} className="gap-2 cursor-pointer text-muted-foreground">
                  <X size={12} /> Clear
                </DropdownMenuItem>
              )}
              {[
                { value: "Critical", icon: Flame,         color: "text-destructive"      },
                { value: "High",     icon: AlertTriangle, color: "text-orange-500"        },
                { value: "Medium",   icon: Minus,         color: "text-yellow-500"        },
                { value: "Low",      icon: TrendingDown,  color: "text-muted-foreground"  },
              ].map(({ value, icon: Icon, color }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setFilterPriority(filterPriority === value ? null : value)}
                  className={cn("gap-2 cursor-pointer", filterPriority === value && "bg-muted text-foreground")}
                >
                  <Icon size={12} className={cn("shrink-0", color)} />
                  {value}
                  {filterPriority === value && <Check size={11} className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className={cn(
                "flex items-center gap-1 h-8 px-3 rounded-full border text-xs cursor-pointer transition-colors",
                filterType
                  ? "bg-primary/10 dark:bg-white/10 border-primary/30 dark:border-white/30 text-primary dark:text-white"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}>
                {filterType ?? "Type"}
                <ChevronDown size={10} className="shrink-0" />
              </button>
            } />
            <DropdownMenuContent align="start" className="p-1 w-40">
              {filterType && (
                <DropdownMenuItem onClick={() => setFilterType(null)} className="gap-2 cursor-pointer text-muted-foreground">
                  <X size={12} /> Clear
                </DropdownMenuItem>
              )}
              {[
                { value: "Bug",   icon: Bug,         color: "text-red-500"    },
                { value: "Story", icon: BookOpen,    color: "text-blue-500"   },
                { value: "Task",  icon: CheckSquare, color: "text-green-500"  },
                { value: "Epic",  icon: Zap,         color: "text-purple-500" },
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

          {/* Clear all filters */}
          {(activeFilterCount > 0 || search) && (
            <button
              onClick={() => { setSearch(""); setFilterPriority(null); setFilterType(null); setFilterMemberId(null); }}
              className="flex items-center gap-1 h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={11} /> Clear all
            </button>
          )}
        </div>

        {/* ── Bulk action bar ── */}
        {!readOnly && selectedIds.size > 0 && (
          <Card className="rounded-xl">
            <CardContent className="flex items-center gap-3">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Separator orientation="vertical" />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm cursor-pointer hover:text-foreground text-muted-foreground transition-colors">
                  Move to sprint <ChevronDown size={13} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {projectSprints.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => {
                        issueList.filter((i) => selectedIds.has(i.id)).forEach((i) => updateIssue({ ...i, sprintId: s.id }));
                        setSelectedIds(new Set());
                      }}
                    >
                      {s.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      issueList.filter((i) => selectedIds.has(i.id)).forEach((i) => updateIssue({ ...i, sprintId: undefined }));
                      setSelectedIds(new Set());
                    }}
                  >
                    Move to backlog
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto cursor-pointer"
              >
                Clear
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Backlog ── */}
        <SprintGroup
          label="Backlog"
          issues={backlogIssues}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onIssueClick={openDetail}
          onAddIssue={readOnly ? undefined : () => setCreateOpen(true)}
          onDeleteIssue={readOnly ? undefined : setDeleteTarget}
          defaultOpen
          headerBadge={<ListTree size={13} className="text-muted-foreground" />}
        />
      </div>

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
        readOnly={readOnly}
        onOpenChange={setDetailOpen}
        onUpdate={updateIssue}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete issue?"
        description={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteIssue(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppSidebar>
  );
}

export default function BacklogPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <React.Suspense>
      <BacklogPageInner params={params} />
    </React.Suspense>
  );
}
