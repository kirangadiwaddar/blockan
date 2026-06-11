"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useIssues } from "@/lib/issues-context";
import { useProjects } from "@/lib/projects-context";
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
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { CreateIssueSheet } from "@/components/board/create-issue-sheet";

/* ─── Config ──────────────────────────────────────────────── */

const LABEL_PALETTE = ["#6366f1","#3b82f6","#22c55e","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6","#f97316","#64748b"];
function labelColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}

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
  sprintId,
  projectId,
  projectUuid,
  projectKey,
  selectedIds,
  onSelect,
  onIssueClick,
  onCreated,
  onAddIssue,
  onDeleteIssue,
  defaultOpen,
  headerBadge,
}: {
  label: string;
  issues: Issue[];
  sprintId?: string;
  projectId: string;
  projectUuid?: string;
  projectKey?: string;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onIssueClick: (issue: Issue) => void;
  onCreated: (issue: Issue) => void;
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{issue.title}</span>
                          {(issue.labels ?? []).map((l) => (
                            <span
                              key={l}
                              className="inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 text-white shrink-0"
                              style={{ backgroundColor: labelColor(l) }}
                            >
                              {l}
                            </span>
                          ))}
                        </div>
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
                              <AvatarFallback className="text-xs">{a.initials}</AvatarFallback>
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
  const { projects, sprintsForProject, projectBySlug, uuidForSlug, loading: projectsLoading } = useProjects();
  const project        = projectBySlug(projectId) ?? projects[0];
  const projectSprints = sprintsForProject(project?.id ?? projectId);
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

  const backlogIssues = issueList.filter((i) => !i.sprintId);

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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`avatar-orb ${project.color} size-7 rounded-full`} />
            <h1 className="text-xl font-semibold">{project.name} — Backlog</h1>
          </div>
          <Link
            href={`/projects/${project.id}/board`}
            className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}
          >
            <SquareStack size={14} /> Board view
          </Link>
        </div>

        {/* ── Bulk action bar ── */}
        {selectedIds.size > 0 && (
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
          projectId={project.id}
          projectUuid={uuidForSlug(project.id)}
          projectKey={project.key}
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onIssueClick={openDetail}
          onCreated={addIssue}
          onAddIssue={() => setCreateOpen(true)}
          onDeleteIssue={setDeleteTarget}
          defaultOpen
          headerBadge={<ListTree size={13} className="text-muted-foreground" />}
        />
      </div>

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
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
