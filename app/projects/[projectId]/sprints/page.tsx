"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProjects, useProjectRole, canEditProject, canManageSprints } from "@/lib/projects-context";
import { useIssues } from "@/lib/issues-context";
import { Issue, Sprint } from "@/lib/types";
import AppSidebar from "@/components/shadcn-space/blocks/dashboard/app-sidebar";
import { IssueDetailSheet } from "@/components/issue/issue-detail-sheet";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Bug, BookOpen, CheckSquare, Zap,
  ChevronRight, Plus, CalendarDays, MoreHorizontal,
  Play, CheckCheck, Archive, Grid3x2, Flag, Search, X,
  Pencil, Trash2, ArrowLeftRight, LayoutList, Target, Star,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundBlock } from "@/components/ui/not-found-block";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, progressColor } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

/* ─── helpers ───────────────────────────────────────────────── */

const typeIcon: Record<string, React.ElementType> = {
  Bug: Bug, Story: BookOpen, Task: CheckSquare, Epic: Zap,
};
const typeColor: Record<string, string> = {
  Bug: "text-red-500", Story: "text-blue-500", Task: "text-green-500", Epic: "text-purple-500",
};
const statusDot: Record<string, string> = {
  "Todo": "bg-muted-foreground", "In Progress": "bg-blue-500",
  "Reviewing": "bg-purple-500", "Completed": "bg-green-500",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sprintStatusBadge(status: Sprint["status"]) {
  if (status === "active")
    return <Badge className="bg-blue-500/10 text-blue-500 font-normal">Active</Badge>;
  if (status === "planned")
    return <Badge variant="outline" className="font-normal">Planned</Badge>;
  return <Badge variant="secondary" className="font-normal">Completed</Badge>;
}

/* ─── Add issues to sprint dialog ───────────────────────────── */

function AddIssuesToSprintDialog({
  sprint,
  backlogIssues,
  onAdd,
}: {
  sprint: Sprint;
  backlogIssues: Issue[];
  onAdd: (issues: Issue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = backlogIssues.filter((i) =>
    !query || i.title.toLowerCase().includes(query.toLowerCase()) || (i.code ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(backlogIssues.filter((i) => selected.has(i.id)));
    setSelected(new Set());
    setQuery("");
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 cursor-pointer h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus size={12} /> Add issues
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelected(new Set()); setQuery(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add issues to {sprint.name}</DialogTitle>
            <DialogDescription>Select backlog issues to assign to this sprint.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search issues…"
                className="pl-8 h-9 text-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="flex items-center gap-0.5 hover:text-foreground cursor-pointer">
                  <X size={11} /> Clear
                </button>
              </div>
            )}
            <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto -mx-1 px-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {backlogIssues.length === 0 ? "All issues are already in a sprint." : "No issues match your search."}
                </p>
              ) : (
                filtered.map((issue) => {
                  const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                  const isSelected = selected.has(issue.id);
                  return (
                    <button
                      key={issue.id}
                      onClick={() => toggle(issue.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer w-full",
                        isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("size-4 rounded border flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-primary border-primary" : "border-border")}>
                        {isSelected && <CheckSquare size={10} className="text-primary-foreground" />}
                      </div>
                      <TypeIcon size={13} className={cn(typeColor[issue.type], "shrink-0")} />
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{issue.code}</span>
                      <span className="text-sm truncate flex-1">{issue.title}</span>
                      <span className={cn("size-2 rounded-full shrink-0", statusDot[issue.status] ?? "bg-muted-foreground")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleAdd} disabled={selected.size === 0} className="cursor-pointer">
              Add {selected.size > 0 ? `${selected.size} issue${selected.size > 1 ? "s" : ""}` : "issues"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Edit sprint dialog ─────────────────────────────────────── */

function EditSprintDialog({
  sprint,
  onSave,
  trigger,
}: {
  sprint: Sprint;
  onSave: (data: { name: string; goal: string; startDate: string; endDate: string }) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? "");
  const [start, setStart] = useState(sprint.startDate);
  const [end, setEnd] = useState(sprint.endDate);

  const handleOpen = (v: boolean) => {
    if (v) { setName(sprint.name); setGoal(sprint.goal ?? ""); setStart(sprint.startDate); setEnd(sprint.endDate); }
    setOpen(v);
  };

  const submit = () => {
    if (!name.trim() || !start || !end) return;
    onSave({ name: name.trim(), goal: goal.trim(), startDate: start, endDate: end });
    setOpen(false);
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Sprint</DialogTitle>
            <DialogDescription>Update sprint details.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Sprint name <span className="text-destructive">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint name" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Goal</label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What will this sprint deliver?" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start date <span className="text-destructive">*</span></label>
              <DatePicker value={start} onChange={setStart} onClear={() => setStart("")} placeholder="Pick start date" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End date <span className="text-destructive">*</span></label>
              <DatePicker value={end} onChange={setEnd} onClear={() => setEnd("")} placeholder="Pick end date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || !start || !end} className="cursor-pointer">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Sprint card ───────────────────────────────────────────── */

function SprintCard({
  sprint,
  issues,
  backlogIssues,
  allSprints,
  onIssueClick,
  onStatusChange,
  onAddIssues,
  onEdit,
  onDelete,
  onRemoveIssue,
  onMoveIssue,
  sprintAdmin,
}: {
  sprint: Sprint;
  issues: Issue[];
  backlogIssues: Issue[];
  allSprints: Sprint[];
  onIssueClick: (issue: Issue) => void;
  onStatusChange: (id: string, status: Sprint["status"]) => void;
  onAddIssues: (sprintId: string, issues: Issue[]) => void;
  onEdit: (id: string, data: { name: string; goal: string; startDate: string; endDate: string }) => void;
  onDelete: (id: string) => void;
  onRemoveIssue: (issue: Issue) => void;
  onMoveIssue: (issue: Issue, targetSprintId: string) => void;
  sprintAdmin?: boolean;
}) {
  const [open, setOpen] = useState(sprint.status === "active");
  const done = issues.filter((i) => i.status === "Completed").length;
  const pts  = issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const progress = issues.length > 0 ? Math.round((done / issues.length) * 100) : 0;

  return (
    <Card className="rounded-2xl overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="border-b">
          <CollapsibleTrigger className="w-full text-left cursor-pointer">
            <div className="flex items-center gap-2 flex-wrap">
              <ChevronRight
                size={14}
                className={cn("text-muted-foreground transition-transform duration-150 shrink-0", open && "rotate-90")}
              />
              <CardTitle>{sprint.name}</CardTitle>
              {sprintStatusBadge(sprint.status)}
              <Badge variant="outline" className="font-normal">{issues.length} issues</Badge>
              {sprint.goal && (
                <span className="text-xs text-muted-foreground hidden sm:inline">{sprint.goal}</span>
              )}
            </div>
          </CollapsibleTrigger>
          <CardAction>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                <span>{fmt(sprint.startDate)} – {fmt(sprint.endDate)}</span>
              </div>
              {pts > 0 && (
                <span className="text-xs text-muted-foreground">{pts} pts</span>
              )}
              {sprintAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {sprint.status === "planned" && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onStatusChange(sprint.id, "active")}>
                        <Play size={13} /> Start sprint
                      </DropdownMenuItem>
                    )}
                    {sprint.status === "active" && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onStatusChange(sprint.id, "completed")}>
                        <CheckCheck size={13} /> Complete sprint
                      </DropdownMenuItem>
                    )}
                    {sprint.status === "completed" && (
                      <DropdownMenuItem className="text-muted-foreground opacity-60" disabled>
                        <Archive size={13} /> Sprint completed
                      </DropdownMenuItem>
                    )}
                    <EditSprintDialog
                      sprint={sprint}
                      onSave={(data) => onEdit(sprint.id, data)}
                      trigger={
                        <DropdownMenuItem className="cursor-pointer" onSelect={(e) => e.preventDefault()}>
                          <Pencil size={13} /> Edit sprint
                        </DropdownMenuItem>
                      }
                    />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => { if (confirm(`Delete "${sprint.name}"? Issues will move to backlog.`)) onDelete(sprint.id); }}
                    >
                      <Trash2 size={13} /> Delete sprint
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardAction>
        </CardHeader>

        <CollapsibleContent>
          {issues.length > 0 && (
            <div className="px-6 py-3 border-b flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-1.5" indicatorClassName={progressColor(progress)} />
              <span className="text-xs text-muted-foreground shrink-0">{done}/{issues.length} done · {progress}%</span>
            </div>
          )}

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 ps-4" />
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Priority</TableHead>
                  <TableHead className="w-28 hidden md:table-cell">Due</TableHead>
                  <TableHead className="w-14">Pts</TableHead>
                  <TableHead className="w-24">Assignees</TableHead>
                  {sprintAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={CheckSquare}
                        title="No issues in this sprint"
                        description="Assign issues from the backlog to this sprint to get started."
                        className="py-10"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((issue) => {
                    const TypeIcon = typeIcon[issue.type] ?? CheckSquare;
                    return (
                      <TableRow
                        key={issue.id}
                        className="cursor-pointer group"
                        onClick={() => onIssueClick(issue)}
                      >
                        <TableCell className="ps-4">
                          <TypeIcon size={13} className={typeColor[issue.type]} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">{issue.code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{issue.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start gap-1.5">
                            <span className={cn("inline-block size-2 rounded-full", statusDot[issue.status] ?? "bg-muted-foreground")} />
                            <span className="text-xs text-muted-foreground hidden lg:inline">{issue.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{issue.priority}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {issue.dueDate ? (
                            <div className="flex items-center gap-1">
                              <CalendarDays size={11} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{fmt(issue.dueDate)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="">
                          <span className="text-xs text-muted-foreground">
                            {issue.storyPoints ? `${issue.storyPoints}pt` : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <AvatarGroup>
                            {issue.assignees.slice(0, 3).map((a) => (
                              <Avatar key={a.id} className="size-7 ring-2 ring-background dark:ring-muted">
                                <AvatarImage src={a.avatar} alt={a.name} />
                                <AvatarFallback colorSeed={a.id}>{a.initials}</AvatarFallback>
                              </Avatar>
                            ))}
                            {issue.assignees.length > 3 && (
                              <AvatarGroupCount className="text-xs">+{issue.assignees.length - 3}</AvatarGroupCount>
                            )}
                          </AvatarGroup>
                        </TableCell>
                        {sprintAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex items-center justify-center size-6 rounded hover:bg-muted transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                                <MoreHorizontal size={13} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer" onClick={() => onRemoveIssue(issue)}>
                                  <X size={12} /> Remove from sprint
                                </DropdownMenuItem>
                                {allSprints.filter((s) => s.id !== sprint.id && s.status !== "completed").map((s) => (
                                  <DropdownMenuItem key={s.id} className="cursor-pointer" onClick={() => onMoveIssue(issue, s.id)}>
                                    <ArrowLeftRight size={12} /> Move to {s.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
          {sprintAdmin && sprint.status !== "completed" && (
            <CardFooter className="px-4 py-2 border-t">
              <AddIssuesToSprintDialog
                sprint={sprint}
                backlogIssues={backlogIssues}
                onAdd={(issues) => onAddIssues(sprint.id, issues)}
              />
            </CardFooter>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ─── Create sprint dialog ───────────────────────────────────── */

function CreateSprintCard({ projectId, onCreated }: { projectId: string; onCreated: (s: Sprint) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const submit = () => {
    if (!name.trim() || !start || !end) return;
    onCreated({
      id: `s-${Date.now()}`,
      projectId,
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate: start,
      endDate: end,
      status: "planned",
    });
    setName(""); setGoal(""); setStart(""); setEnd("");
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 cursor-pointer"
      >
        <Plus size={14} /> Create sprint
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>New Sprint</DialogTitle>
            <DialogDescription>Plan a new sprint for your team.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Sprint name <span className="text-destructive">*</span></label>
              <Input placeholder="e.g. Sprint 9" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Goal</label>
              <Input placeholder="What will this sprint deliver?" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start date <span className="text-destructive">*</span></label>
              <DatePicker value={start} onChange={setStart} onClear={() => setStart("")} placeholder="Pick start date" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End date <span className="text-destructive">*</span></label>
              <DatePicker value={end} onChange={setEnd} onClear={() => setEnd("")} placeholder="Pick end date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || !start || !end} className="cursor-pointer">
              Create sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function SprintsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = React.use(params);
  const { sprintsForProject, addSprint: ctxAddSprint, updateSprintStatus: ctxUpdateSprintStatus, editSprint: ctxEditSprint, deleteSprint: ctxDeleteSprint, projectBySlug, loading: projectsLoading } = useProjects();
  const { issues: allCtxIssues, updateIssue: ctxUpdateIssue, loading: issuesLoading, refreshIssues } = useIssues();

  const project   = projectBySlug(projectId);
  const sprintList = sprintsForProject(project?.id ?? projectId);
  const issueList  = allCtxIssues.filter((i) => i.projectId === project?.id);
  const role        = useProjectRole(projectId);

  React.useEffect(() => {
    if (!project) return;
    const hasIssues = allCtxIssues.some((i) => i.projectId === project.id);
    if (!hasIssues && !issuesLoading) refreshIssues().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);
  const readOnly    = !canEditProject(role);
  const sprintAdmin = canManageSprints(role);

  const [detailIssue, setDetailIssue] = useState<Issue | null>(null);
  const [detailOpen, setDetailOpen]   = useState(false);

  const addSprint = (s: Sprint) => ctxAddSprint(s, project?.id ?? projectId);
  const updateSprintStatus = (id: string, status: Sprint["status"]) => ctxUpdateSprintStatus(id, status);
  const updateIssue = (updated: Issue) => ctxUpdateIssue(updated);
  const openDetail = (issue: Issue) => { setDetailIssue(issue); setDetailOpen(true); };

  const addIssuesToSprint = (sprintId: string, issues: Issue[]) => {
    issues.forEach((i) => ctxUpdateIssue({ ...i, sprintId, updatedAt: new Date().toISOString() }));
  };

  const removeIssueFromSprint = (issue: Issue) =>
    ctxUpdateIssue({ ...issue, sprintId: undefined, updatedAt: new Date().toISOString() });

  const moveIssueBetweenSprints = (issue: Issue, targetSprintId: string) =>
    ctxUpdateIssue({ ...issue, sprintId: targetSprintId, updatedAt: new Date().toISOString() });

  const handleDeleteSprint = (id: string) => {
    // Move all issues in this sprint back to backlog first
    issueList.filter((i) => i.sprintId === id).forEach((i) =>
      ctxUpdateIssue({ ...i, sprintId: undefined, updatedAt: new Date().toISOString() })
    );
    ctxDeleteSprint(id);
  };

  // Issues with no sprint assigned = backlog
  const backlogIssues = issueList.filter((i) => !i.sprintId);

  if (!project && (projectsLoading || issuesLoading)) {
    return (
      <AppSidebar>
        <div className="flex flex-col gap-5 p-6 w-full">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="px-6 py-3">
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
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

  const activeSprint    = sprintList.find((s) => s.status === "active");
  const plannedSprints  = sprintList.filter((s) => s.status === "planned");
  const completedSprints = sprintList.filter((s) => s.status === "completed");

  const totalPts   = issueList.reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const donePts    = issueList.filter((i) => i.status === "Completed").reduce((s, i) => s + (i.storyPoints ?? 0), 0);
  const doneCount  = issueList.filter((i) => i.status === "Completed").length;

  return (
    <AppSidebar>
      <div className="flex flex-col gap-5 p-6 w-full">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`avatar-orb ${project.color} size-7 rounded-full shrink-0`} />
            <h1 className="text-xl font-semibold truncate">{project.name} — Sprints</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/board`}
              className={buttonVariants({ variant: "outline", className: "cursor-pointer flex-1 sm:flex-none justify-center" })}
            >
              <Grid3x2 size={14} /> Board view
            </Link>
            {sprintAdmin && <CreateSprintCard projectId={project.id} onCreated={addSprint} />}
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total sprints",  value: sprintList.length,                       icon: LayoutList,  color: "text-blue-500",   bg: "bg-blue-500/10"   },
            { label: "Active sprint",  value: activeSprint?.name ?? "—",               icon: Star,        color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Issues done",    value: `${doneCount} / ${issueList.length}`,    icon: CheckCheck,  color: "text-green-500",  bg: "bg-green-500/10"  },
            { label: "Points done",    value: `${donePts} / ${totalPts} pts`,          icon: Target,      color: "text-orange-500", bg: "bg-orange-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon size={15} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-none mb-1 truncate">{label}</p>
                <p className="text-base font-bold leading-none truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Active sprint ── */}
        {activeSprint && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground capitalize tracking-wide flex items-center gap-1.5">
               Active Sprint
            </p>
            <SprintCard
              sprint={activeSprint}
              issues={issueList.filter((i) => i.sprintId === activeSprint.id)}
              backlogIssues={backlogIssues}
              allSprints={sprintList}
              onIssueClick={openDetail}
              onStatusChange={updateSprintStatus}
              onAddIssues={addIssuesToSprint}
              onEdit={ctxEditSprint}
              onDelete={handleDeleteSprint}
              onRemoveIssue={removeIssueFromSprint}
              onMoveIssue={moveIssueBetweenSprints}
              sprintAdmin={sprintAdmin}
            />
          </div>
        )}

        {/* ── Planned sprints ── */}
        {plannedSprints.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planned</p>
            {plannedSprints.map((s) => (
              <SprintCard
                key={s.id}
                sprint={s}
                issues={issueList.filter((i) => i.sprintId === s.id)}
                backlogIssues={backlogIssues}
                allSprints={sprintList}
                onIssueClick={openDetail}
                onStatusChange={updateSprintStatus}
                onAddIssues={addIssuesToSprint}
                onEdit={ctxEditSprint}
                onDelete={handleDeleteSprint}
                onRemoveIssue={removeIssueFromSprint}
                onMoveIssue={moveIssueBetweenSprints}
                sprintAdmin={sprintAdmin}
              />
            ))}
          </div>
        )}

        {/* ── Empty state when no sprints exist ── */}
        {sprintList.length === 0 && (
          <EmptyState
            icon={Flag}
            title="No sprints yet"
            description="Create your first sprint to start planning and tracking your team's work."
          />
        )}


        {/* ── Completed sprints ── */}
        {completedSprints.length > 0 && (
          <div className="flex flex-col gap-2">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
            {completedSprints.map((s) => (
              <SprintCard
                key={s.id}
                sprint={s}
                issues={issueList.filter((i) => i.sprintId === s.id)}
                backlogIssues={backlogIssues}
                allSprints={sprintList}
                onIssueClick={openDetail}
                onStatusChange={updateSprintStatus}
                onAddIssues={addIssuesToSprint}
                onEdit={ctxEditSprint}
                onDelete={handleDeleteSprint}
                onRemoveIssue={removeIssueFromSprint}
                onMoveIssue={moveIssueBetweenSprints}
                sprintAdmin={sprintAdmin}
              />
            ))}
          </div>
        )}
      </div>

      <IssueDetailSheet
        issue={detailIssue}
        open={detailOpen}
        readOnly={readOnly}
        onOpenChange={setDetailOpen}
        onUpdate={updateIssue}
      />
    </AppSidebar>
  );
}
